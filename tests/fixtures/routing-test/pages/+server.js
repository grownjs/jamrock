export function stuff(_, opts) {
  console.log({ opts });
}

export default {
  ['GET /sitemap.xml']() {
    // ok
  },
};
