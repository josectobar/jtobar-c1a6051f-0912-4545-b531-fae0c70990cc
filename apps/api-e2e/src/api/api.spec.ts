const run = Date.now();

function url(path: string) {
  return `${global.BASE_URL}${path}`;
}

async function post(path: string, body: unknown, token?: string) {
  return fetch(url(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function get(path: string, token?: string) {
  return fetch(url(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function patch(path: string, body: unknown, token?: string) {
  return fetch(url(path), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function del(path: string, token?: string) {
  return fetch(url(path), {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('end-to-end tests', () => {
  let ownerToken: string;
  let viewerToken: string;
  let ownerTaskId: number;
  let viewerTaskId: number;

  beforeAll(async () => {
    const res = await post('/auth/sign-up', {
      firstName: 'Alice',
      lastName: 'Owner',
      email: `alice+${run}@example.com`,
      password: 'password123',
      orgName: `SmokeOrg-${run}`,
    });
    ownerToken = (await res.json()).access_token;
  });

  describe('Auth', () => {
    it('POST /auth/sign-up creates org and Owner, returns JWT', () => {
      expect(ownerToken).toBeDefined();
    });

    it('POST /auth/login with valid credentials returns JWT', async () => {
      const res = await post('/auth/login', {
        email: `alice+${run}@example.com`,
        password: 'password123',
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.access_token).toBeDefined();
    });

    it('POST /auth/login with wrong password returns 401', async () => {
      const res = await post('/auth/login', {
        email: `alice+${run}@example.com`,
        password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Tasks (Owner)', () => {
    beforeAll(async () => {
      const res = await post('/tasks', { title: 'Smoke task' }, ownerToken);
      ownerTaskId = (await res.json()).id;
    });

    it('GET /tasks without token returns 401', async () => {
      const res = await get('/tasks');
      expect(res.status).toBe(401);
    });

    it('POST /tasks creates a task', () => {
      expect(ownerTaskId).toBeDefined();
    });

    it('GET /tasks returns task list', async () => {
      const res = await get('/tasks', ownerToken);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((t: { id: number }) => t.id === ownerTaskId)).toBe(true);
    });

    it('GET /tasks/:id returns the task', async () => {
      const res = await get(`/tasks/${ownerTaskId}`, ownerToken);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(ownerTaskId);
    });

    it('PATCH /tasks/:id updates the task', async () => {
      const res = await patch(
        `/tasks/${ownerTaskId}`,
        { title: 'Updated smoke task' },
        ownerToken,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe('Updated smoke task');
    });

    it('DELETE /tasks/:id removes the task', async () => {
      const res = await del(`/tasks/${ownerTaskId}`, ownerToken);
      expect(res.status).toBe(200);
    });
  });

  describe('RBAC enforcement', () => {
    beforeAll(async () => {
      await post(
        '/users',
        {
          firstName: 'Bob',
          lastName: 'Viewer',
          email: `bob+${run}@example.com`,
          password: 'password123',
          role: 'Viewer',
        },
        ownerToken,
      );
      const res = await post('/auth/login', {
        email: `bob+${run}@example.com`,
        password: 'password123',
      });
      viewerToken = (await res.json()).access_token;
    });

    it('Viewer can create a task', async () => {
      const res = await post('/tasks', { title: "Viewer's task" }, viewerToken);
      expect(res.status).toBe(201);
      viewerTaskId = (await res.json()).id;
    });

    it('Viewer can update their own task', async () => {
      const res = await patch(
        `/tasks/${viewerTaskId}`,
        { title: "Viewer's updated task" },
        viewerToken,
      );
      expect(res.status).toBe(200);
    });

    it("Viewer cannot update Owner's task → 403", async () => {
      const created = await post('/tasks', { title: "Owner's task" }, ownerToken);
      const { id } = await created.json();
      const res = await patch(`/tasks/${id}`, { title: 'Hijacked' }, viewerToken);
      expect(res.status).toBe(403);
    });

    it('Viewer cannot POST /users → 403', async () => {
      const res = await post(
        '/users',
        {
          firstName: 'Eve',
          lastName: 'Hacker',
          email: `eve+${run}@example.com`,
          password: 'password123',
          role: 'Viewer',
        },
        viewerToken,
      );
      expect(res.status).toBe(403);
    });

    it('Viewer cannot POST /organizations → 403', async () => {
      const res = await post('/organizations', { name: 'HackedOrg' }, viewerToken);
      expect(res.status).toBe(403);
    });
  });
});
