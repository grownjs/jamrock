/* eslint-disable no-constant-condition */

import { Gio, GLib } from './deps.ts';

import type { SpawnOptions } from './main.ts';

const decoder = new TextDecoder();

export function ip() {
  const buffer = exec(process.env.OS_NAME === 'Darwin' ? 'ipconfig getifaddr en0' : 'hostname -I');
  return buffer?.split('')[0];
}

export function exec(cmd: string) {
  let [success, stdout, stderr] = GLib.spawn_command_line_sync(cmd);
  try {
    if (stderr) console.error(decoder.decode(stderr));
    if (success && stdout) return decoder.decode(stdout).trim();
  } catch (e) {
    console.error(e);
  }
}

function readNextLine(options: SpawnOptions, cancellable: Gio.Cancellable, inputStream: Gio.DataInputStream) {
  inputStream.read_line_async(GLib.PRIORITY_LOW, null, (stream, res) => {
    if (!stream) return;

    try {
      const [line] = stream.read_line_finish_utf8(res);

      if (line !== null) {
        if (options.onInput && options.onInput(line) !== true) {
          cancellable.cancel();
          return;
        }
        readNextLine(options, cancellable, stream);
      }
    } catch (e) {
      console.error(e);
    }
  });
}

export function spawn(argv: string[], options: SpawnOptions = {}) {
  const proc = new Gio.Subprocess({ argv, flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.NONE });

  if (options.onInput) {
    const cancellable = new Gio.Cancellable();

    proc.init(cancellable);

    cancellable.connect(() => {
      if (options.onClose) options.onClose(proc);
    });

    const stream = new Gio.DataInputStream({ base_stream: proc.get_stdout_pipe()!, close_base_stream: true });
    readNextLine(options, cancellable, stream);
  } else {
    proc.init(null);
    proc.communicate_utf8_async(null, null, (obj, res) => {
      if (!obj) return;

      const [success, stdout, stderr] = obj.communicate_utf8_finish(res);
      if (options.onFinish) options.onFinish({ success, stdout, stderr });
    });
  }
  return proc;
}

export function readDir(filepath: string, callback: any) {
  const directory = Gio.File.new_for_path(filepath);
  const children = directory.enumerate_children('standard', 0, null);

  while (true) {
    const file = children.next_file(null);
    if (!file || (callback(file) === true)) break;
  }
}
