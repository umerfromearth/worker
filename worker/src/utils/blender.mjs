export default class LogsParser {
  constructor(logs) {
    this.logs = logs;
    this.logEntries = logs
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => Boolean(entry));
    this.render = {};
  }

  parse() {
    this.render.timeTaken =
      this.logEntries[this.logEntries.length - 2].match(
        /Time: (\d+:\d+\.\d+)/,
      )[1];

    this.render.savedTo =
      this.logEntries[this.logEntries.length - 3].match(/Saved: '([^']+)'/)[1];
    return this.render;
  }
}

// const logs = `Blender 4.3.2
// Read blend: "/home/umar/Projects/blender-render-farm/worker/downloads/4ceb7876-0009-480a-88e3-8c01fab243d0"
// Fra:1 Mem:77.36M (Peak 77.36M) | Time:00:02.61 | Rendering 1 / 64 samples

// Fra:1 Mem:77.36M (Peak 77.36M) | Time:00:04.11 | Rendering 25 / 64 samples

// Fra:1 Mem:77.36M (Peak 77.36M) | Time:00:05.58 | Rendering 50 / 64 samples

// Fra:1 Mem:77.36M (Peak 77.36M) | Time:00:06.55 | Rendering 64 / 64 samples

// Saved: 'renders/4ceb7876-0009-480a-88e3-8c01fab243d-0001.png'
// Time: 00:07.84 (Saving: 00:01.00)
// `;
// const parser = new LogsParser(logs);
// const render = parser.parse();
// console.log(render);
