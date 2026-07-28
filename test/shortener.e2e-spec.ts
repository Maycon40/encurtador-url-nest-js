describe('Shortener API (e2e)', () => {
  const baseUrl = 'http://localhost:3000';

  describe('POST /shorten', () => {
    it('should return 400 when original_url is missing', async () => {
      const res = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 400,
        error: 'The param original url is required',
      });
    });

    it('should return 400 when original_url is invalid', async () => {
      const res = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'invalid-url' }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 400,
        error: 'The param original url is invalid',
      });
    });

    it('should return 201 and shorten URL successfully', async () => {
      const res = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'https://www.google.com' }),
      });

      expect(res.status).toBe(201);
      const responseBody = await res.json();

      expect(responseBody).toEqual({
        code: responseBody.code,
        original_url: 'https://www.google.com',
        short_url: `${baseUrl}/${responseBody.code}`,
        clicks: 0,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        status_code: 201,
      });
    });
  });

  describe('GET /:code', () => {
    it('should return 404 for non-existent code', async () => {
      const res = await fetch(`${baseUrl}/nonexistentcode123`, {
        redirect: 'manual',
      });

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Could not find shortened link!',
      });
    });

    it('should return 302 redirect for valid code', async () => {
      const resCode = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'https://www.google.com' }),
      });

      const createdCode = (await resCode.json()).code;

      const res = await fetch(`${baseUrl}/${createdCode}`, {
        redirect: 'manual',
      });

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('https://www.google.com');
    });
  });

  describe('GET /statistics/:code', () => {
    it('should return 404 statistics for non-existent code', async () => {
      const res = await fetch(`${baseUrl}/statistics/nonexistentcode123`);

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Could not find shortened link!',
      });
    });

    it('should return 200 and link statistics for valid code', async () => {
      const resCode = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'https://www.google.com' }),
      });

      const createdCode = (await resCode.json()).code;

      const res = await fetch(`${baseUrl}/statistics/${createdCode}`);

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        code: createdCode,
        clicks: 0,
        original_url: 'https://www.google.com',
        short_url: `${baseUrl}/${createdCode}`,
        status_code: 200,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });
  });

  describe('PUT /:code', () => {
    it('should return 400 when original_url is missing', async () => {
      const res = await fetch(`${baseUrl}/nonexistentcode123`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 400,
        error: 'The param original url is required',
      });
    });

    it('should return 400 when original_url is invalid', async () => {
      const res = await fetch(`${baseUrl}/nonexistentcode123`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'invalid-url' }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 400,
        error: 'The param original url is invalid',
      });
    });

    it('should return 404 when updating non-existent code', async () => {
      const res = await fetch(`${baseUrl}/nonexistentcode123`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'https://www.github.com' }),
      });

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Could not find shortened link!',
      });
    });

    it('should return 200 when updating existing code', async () => {
      const resCode = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'https://www.google.com' }),
      });

      const createdCode = (await resCode.json()).code;

      const res = await fetch(`${baseUrl}/${createdCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'https://www.github.com' }),
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        code: createdCode,
        original_url: 'https://www.github.com',
        short_url: `${baseUrl}/${createdCode}`,
        status_code: 200,
      });
    });
  });

  describe('DELETE /:code', () => {
    it('should return 404 when deleting non-existent code', async () => {
      const res = await fetch(`${baseUrl}/nonexistentcode123`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Could not find shortened link!',
      });
    });

    it('should return 200 when deleting existing code', async () => {
      const resCode = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'https://www.google.com' }),
      });

      const createdCode = (await resCode.json()).code;

      const res = await fetch(`${baseUrl}/${createdCode}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 200,
        code: createdCode,
        original_url: 'https://www.google.com',
        short_url: `${baseUrl}/${createdCode}`,
      });
    });

    it('should return 404 when trying to delete already deleted code', async () => {
      const resCode = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_url: 'https://www.google.com' }),
      });

      const createdCode = (await resCode.json()).code;

      const res = await fetch(`${baseUrl}/${createdCode}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 200,
        code: createdCode,
        original_url: 'https://www.google.com',
        short_url: `${baseUrl}/${createdCode}`,
      });

      const res2 = await fetch(`${baseUrl}/${createdCode}`, {
        method: 'DELETE',
      });

      expect(res2.status).toBe(404);

      const responseBody2 = await res2.json();

      expect(responseBody2).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Could not find shortened link!',
      });
    });
  });
});
