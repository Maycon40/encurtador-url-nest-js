<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# Encurtador de URL (URL Shortener API)

API RESTful desenvolvida em NestJS para criação, gerenciamento e acompanhamento de URLs encurtadas, com redirecionamento automático e coleta de métricas/estatísticas de acesso.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js** & **TypeScript**
- **NestJS** - Framework Node.js para construção de aplicações server-side eficientes e escaláveis
- **PostgreSQL** - Banco de dados relacional para persistência dos links e estatísticas
- **Jest** - Framework de testes em JavaScript para execução das suítes de testes automatizados

---

## 📌 Endpoints da API

### 1. Encurtar URL

- **POST** `/shorten`
- **Body:** `{ "original_url": "https://exemplo.com" }`
- **Respostas:**
  - `201 Created`: Retorna o código gerado, URL encurtada e datas de criação/expiração.
  - `400 Bad Request`: Parâmetros inválidos ou URL ausente.

### 2. Redirecionar URL

- **GET** `/:code`
- **Respostas:**
  - `302 Found`: Redireciona para a URL original e incrementa o contador de cliques.
  - `401 Unauthorized`: Link expirado.
  - `404 Not Found`: Código de URL encurtada não encontrado.

### 3. Estatísticas da URL

- **GET** `/static/:code`
- **Respostas:**
  - `200 OK`: Retorna métricas como número de cliques, datas de criação, atualização e expiração.
  - `404 Not Found`: Código não encontrado.

### 4. Atualizar URL Original

- **PUT** `/:code`
- **Body:** `{ "original_url": "https://nova-url.com" }`
- **Respostas:**
  - `200 OK`: URL original atualizada com sucesso.
  - `404 Not Found`: Código não encontrado.

### 5. Deletar URL Encurtada

- **DELETE** `/:code`
- **Respostas:**
  - `200 OK`: Link encurtado removido.
  - `404 Not Found`: Código não encontrado.

### 6. Status do Sistema

- **GET** `/api/v1/status`
- **Respostas:**
  - `200 OK`: Retorna o status da aplicação e estatísticas das conexões do banco de dados PostgreSQL.

---

## 🧪 Testes Automatizados

O projeto conta com suítes de testes e2e (end-to-end) que validam a integração completa da aplicação, testando tanto os cenários de sucesso quanto os de erro.

### Executando os testes:

```bash
# Testes unitários
$ npm run test

# Testes e2e (End-to-End)
$ npm run test:e2e

# Cobertura de testes
$ npm run test:cov
```

---

## 🚀 Como Executar o Projeto

```bash
# Instalar dependências
$ npm install

# Executar em modo de desenvolvimento
$ npm run start:dev

# Executar em modo de produção
$ npm run start:prod
```
