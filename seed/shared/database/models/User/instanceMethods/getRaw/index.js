module.exports = function getRaw() {
  const response = {
    id: this.id,
    role: this.role,
    email: this.email,
    picture: this.picture,
    verified: this.verified,
  };

  return response;
};
