import { Controller, Get } from "@nestjs/common";

@Controller()
export class StatusController{

  @Get('/api/v1/status')
  status() {
    const updatedAt = new Date().toISOString();

    return {
      updated_at: updatedAt,
      dependencies: {
        status: "online"
      }
    }
  }
}