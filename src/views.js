export function toUserView(user) {
  return { id: String(user._id), email: user.email, name: user.name };
}
