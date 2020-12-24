module.exports = ctx => {
  return `
    <h1>Hello World from ${ctx.req.originalUrl}</h1>
    <a href="/">Back home</a>
`;
};
