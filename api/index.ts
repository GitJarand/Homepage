import app from '../server/app'

export default async function handler(req: Request): Promise<Response> {
  return app.fetch(req)
}
