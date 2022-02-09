export const getUserIdFromRequest = (request) => {
  const authHeader = request.headers['authorization'];
  const token = authHeader.split(' ')[1];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch (e) {
    return null;
  }
};
