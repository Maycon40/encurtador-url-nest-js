import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PerformanceAudit');

  private readonly TIMEOUT_THRESHOLDS: Record<string, number> = {
    'POST /api/v1/auth/refresh': 100, // Crítico: Máximo 100ms
    'GET /api/v1/auth/profile': 150, // Leitura: Máximo 150ms
    'POST /api/v1/auth/login': 700, // Hashing: Máximo 700ms
    'POST /api/v1/auth/register': 1400, // Hashing: Máximo 1400ms
    'POST /api/v1/auth/activations': 800, // Hashing: Máximo 800ms
    'PATCH /api/v1/auth/activations/:email': 800, // Hashing: Máximo 800ms
    'GET /:code': 100, // Redirecionamento: Máximo 100ms
    'GET /api/v1/links': 300, // Listagem: Máximo 300ms
    'GET /api/v1/links/:code': 100, // Detalhes: Máximo 100ms
    'POST /api/v1/links': 200, // Criação: Máximo 200ms
    'PUT /api/v1/links/:code': 200, // Atualização: Máximo 200ms
    'DELETE /api/v1/links/:code': 200, // Exclusão: Máximo 200ms
    DEFAULT: 300, // Qualquer outra rota: Máximo 300ms
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.route?.path || request.url;
    const routeKey = `${method} ${url}`;

    const maxAllowedTime =
      this.TIMEOUT_THRESHOLDS[routeKey] || this.TIMEOUT_THRESHOLDS.DEFAULT;

    const startTime = performance.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Math.round(performance.now() - startTime);

        if (duration > maxAllowedTime) {
          this.logger.error(
            `🚨 SLOW ENDPOINT DETECTED: [${routeKey}] levou ${duration}ms (Limite: ${maxAllowedTime}ms)`,
          );
        } else {
          this.logger.log(`⏱️ [${routeKey}] ${duration}ms`);
        }
      }),
    );
  }
}
