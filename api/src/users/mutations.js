// The deployed service must run as one Node process (the JSON store has the same
// constraint). Serialize role/status checks together with their Firebase mutations.
let queue = Promise.resolve();
export function serializeUserMutation(handler) {
  return (req, res, next) => {
    const run = queue.then(() => handler(req, res, next));
    queue = run.catch(() => undefined);
    return run.catch(next);
  };
}
