export default {
  ['GET /some/:stuff']({ params }) {
    return 42 + ', ' + params.stuff;
  },
};
