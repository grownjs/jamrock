const { useState } = require('jamrock');

function useLocal(name, initial) {
  const key = `@@${name}`;

  let localValue = initial;
  try {
    if (typeof localStorage !== 'undefined' && localStorage[key]) localValue = JSON.parse(localStorage[key]);
  } catch (e) {
    // ignore
  }

  const [value, setValue] = useState(localValue);
  return [value, nextValue => {
    const currentValue = setValue(nextValue);
    if (typeof localStorage !== 'undefined') localStorage[key] = JSON.stringify(currentValue);
  }];
}

module.exports = {
  useLocal,
};
