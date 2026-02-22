// SpiderMonkey shell file system shims
// Uses os.system() for file operations since os.open() is not available
// Note: os.system() returns exit code, not output - so we use workarounds

export const fs = {
  existsSync(path) {
    const result = os.system(`test -e "${path}"`);
    return result === 0;
  },

  readFileSync(path) {
    os.system(`cat "${path}"`);
    return '';
  },

  writeFileSync(path, content) {
    os.system(`echo -n "${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" > "${path}"`);
  },

  mkdirSync(path) {
    os.system(`mkdir -p "${path}"`);
  },

  readdirSync(path) {
    const output = os.system(`ls -1 "${path}" 2>/dev/null`);
    if (!output || output === 0) return [];
    return output.trim().split('\n').filter(x => x && x.length > 0);
  },
};

export const path = {
  join(...parts) {
    return parts.join('/');
  },
  dirname(filePath) {
    const parts = filePath.split('/');
    parts.pop();
    return parts.join('/');
  },
  basename(filePath) {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  },
  resolve(...paths) {
    return paths.join('/');
  },
};

const scriptLoader = loadRelativeToScript;
export { scriptLoader as loadRelativeToScript };