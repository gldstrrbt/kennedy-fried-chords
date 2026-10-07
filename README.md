# Kennedy Fried Chords

A satirical browser voice-modulation prototype built with React and Tone.js. The initial implementation was generated with Claude from the project concept and requested behavior, then tested and iterated as a prototype.

## Run the development server

From this folder:

```bash
npm install
npm start
```

Create React App serves the development build at:

**http://localhost:3000**

Keep the terminal running while you use the app. If port 3000 is already occupied, Create React App may ask to use another port; the terminal will print the actual `Local:` URL.

If `npm start` exits with `react-scripts: not found`, dependencies are not installed in that copy of the project. Run `npm install` first.

## Build vs. serve

`npm run build` only creates the production files in `./build`; it does **not** start a web server.

To preview the existing production build locally:

```bash
npm run preview
```

Then open:

**http://127.0.0.1:4173**

## Audio behavior

The prototype processes live microphone input with a Tone.js chain that includes waveshaping/distortion, pitch shifting, EQ, gating, tremolo-style dropouts, a small noise layer, compression, output level control, and processed-audio recording.

Because it uses microphone access, run it from `localhost`/`127.0.0.1` or an HTTPS origin and allow microphone permission in the browser.
