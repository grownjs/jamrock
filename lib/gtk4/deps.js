export { Gio, GLib, Gtk, Soup } from '../../dist/gtk.mjs';
import { Gio, GLib, Gtk } from '../../dist/gtk.mjs';
import { Util } from '../../dist/main.mjs';

export function sha1Encode(str) {
  return GLib.compute_checksum_for_string(GLib.ChecksumType.SHA1, str, -1);
}

function recursiveGlob(dirPath, re, o = []) {
  const dir = Gio.File.new_for_path(dirPath);

  if (dir.query_exists(null) && dir.query_file_type(Gio.FileQueryInfoFlags.NONE, null) === Gio.FileType.DIRECTORY) {
    const fileEnumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);

    let fileInfo;
    // eslint-disable-next-line no-cond-assign
    while ((fileInfo = fileEnumerator.next_file(null)) !== null) {
      const fileName = fileInfo.get_name();
      const childPath = GLib.build_filenamev([dirPath, fileName]);
      const fileType = fileInfo.get_file_type();
      if (fileType === Gio.FileType.REGULAR) {
        if (re.test(childPath)) o.push(childPath);
      } else if (fileType === Gio.FileType.DIRECTORY) {
        recursiveGlob(childPath, re, o);
      }
    }
    fileEnumerator.close(null);
  }
  return o;
}

function parseGlob(value) {
  const parts = value.split('/');

  let i = 0;
  for (; i < parts.length; i++) {
    if (parts[i].includes('*') || (parts[i].includes('{') && parts[i].includes('}'))) break;
  }

  const dirName = parts.slice(0, i).join('/');
  const globPattern = parts.slice(i).join('/');

  return { dirName, globPattern };
}

function relativePath(fromPath, toPath) {
  const a = Gio.File.new_for_path(fromPath).get_path().split('/');
  const b = Gio.File.new_for_path(toPath).get_path().split('/');
  const length = a.length;
  const out = [];
  let i = 0;
  while (i < length && a[i] === b[i]) i++;
  b.splice(0, i);
  while (i++ < length) out.push('..');
  return out.concat(b).join('/');
}

export function serverResponse(msg, resp) {
  msg.set_status(resp.status, null);

  const contentType = resp.headers['content-type'] || 'text/html; charset=utf-8';
  const [type, _charset] = contentType.split(/;[^=]*=?/);
  const charset = (_charset || 'utf-8').toUpperCase();

  msg.get_response_headers().set_content_type(type, { charset });
  if (typeof resp.body === 'string' && resp.body.length > 0) {
    msg.get_response_body().append(resp.body);
  }
  msg.unpause();
}

export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export function serveStaticFiles(directory) {
  return (req) => {
    const uri = GLib.Uri.parse(req.url, GLib.UriFlags.NONE);

    if (uri.get_path() !== '/') {
      const file = [directory, uri.get_path()].join('');

      if (fs.existsSync(file)) {
        const headers = {
          'content-type': Util.mimeType(file),
        };

        return new Response(fs.readFileSync(file), { ok: true, headers });
      }
    }
  };
}

export function getCwd() {
  return GLib.get_current_dir();
}

export function loadEnv() {
  const env = {};
  for (const envString of GLib.get_environ()) {
    const parts = envString.split('=');
    if (parts.length > 1) {
      const key = parts[0];
      const value = parts.slice(1).join('=');
      env[key] = value;
    }
  }
  return env;
}

export function globSync(s, glob2re) {
  const { dirName, globPattern } = parseGlob(s);
  return recursiveGlob(dirName, glob2re(globPattern, { extended: true }));
}

export function getVersion() {
  const major = Gtk.get_major_version();
  const minor = Gtk.get_minor_version();
  const micro = Gtk.get_micro_version();
  return [major, minor, micro].join('.');
}

export function exitProgram(exitCode) {
  try {
    const windows = Gtk.Window.list_toplevels();
    if (windows && windows.length > 0) {
      Gtk.main_quit();
    }
    GLib.exit?.(exitCode);
  } catch (e) {
    logError(e);
  }
}

function readDir(d) {
  if (!d) return [];

  const directory = Gio.File.new_for_path(d);
  if (!directory.query_exists(null)) return [];

  const children = directory.enumerate_children('standard', 0, null);
  const result = [];

  let file = children.next_file(null);
  while (file) {
    result.push(file);
    file = children.next_file(null);
  }
  children.close(null);
  return result;
}

export const fs = {
  writeFileSync: (f, s) => {
    const file = Gio.File.new_for_path(f);
    const [ok, out] = file.replace_contents(s, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
    if (ok) return out;
  },
  readFileSync: s => {
    const [success, contentsBytes] = GLib.file_get_contents(s);
    if (success) {
      return new TextDecoder('utf-8').decode(contentsBytes);
    }
    return null;
  },
  existsSync: f => GLib.file_test(f, GLib.FileTest.EXISTS),
  statSync: f => ({ isFile: () => GLib.file_test(f, GLib.FileTest.IS_REGULAR) }),
  readdirSync: d => readDir(d).map(f => f.get_name()),
  chmodSync: (f, c) => {
    const [success] = GLib.spawn_command_line_sync(`chmod ${c} "${f}"`);
    return success;
  },
  mkdirSync: d => {
    const destFile = Gio.File.new_for_path(d);

    if (!destFile.query_exists(null)) {
      destFile.make_directory_with_parents(null);
    }
  },
  copyFileSync: (a, b) => {
    const sourceFile = Gio.File.new_for_path(a);
    const destFile = Gio.File.new_for_path(b);

    sourceFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE | Gio.FileCopyFlags.ALL_METADATA, null, null);
  },
  cpSync: (a, b, o) => {
    fs.mkdirSync(b);

    const sourceFile = Gio.File.new_for_path(a);
    const destFile = Gio.File.new_for_path(b);

    for (const file of readDir(a)) {
      const childName = file.get_name();
      const childType = file.get_file_type();
      const childSource = sourceFile.get_child(childName);
      const childDest = destFile.get_child(childName);

      if (childType === Gio.FileType.DIRECTORY) {
        if (o?.recursive) fs.cpSync(childSource.get_path(), childDest.get_path(), o);
      } else if (childType === Gio.FileType.REGULAR) {
        childSource.copy(childDest, Gio.FileCopyFlags.OVERWRITE | Gio.FileCopyFlags.ALL_METADATA, null, null);
      }
    }
  },
};

export const url = {
  fileURLToPath: f => f.replace('file://', ''),
};

export const path = {
  relative: relativePath,
};
