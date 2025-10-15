## Devvit Hello World Starter

A starter to build web applications on Reddit's developer platform

- [Devvit](https://developers.reddit.com/): A way to build and deploy immersive games on Reddit
- [Express](https://expressjs.com/): For backend logic
- [Typescript](https://www.typescriptlang.org/): For type safety

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Run `npm create devvit@latest --template=hello-world`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Features

### Dark Mode Support
SubGuessr now supports both light and dark themes using the Devvit platform's built-in theme system:
- **Automatic Theme Detection**: Respects your system's dark/light mode preference
- **Devvit Integration**: Works seamlessly with Reddit's developer platform dark mode toggle
- **Responsive Design**: Both themes are optimized for mobile and desktop viewing
- **Smooth Transitions**: All theme changes include smooth CSS transitions for a polished experience

The app automatically adapts to your system's color scheme preference and works with the Devvit preview's dark mode toggle.

### Customizable Subreddit List
SubGuessr uses a configurable text file for the list of subreddits to pull images from:
- **Easy Modification**: Edit `subreddits.txt` in the project root to add/remove subreddits
- **Comment Support**: Lines starting with `#` are treated as comments
- **Build-Time Generation**: Subreddits are embedded into the build for Devvit compatibility
- **Validation**: Built-in validation script to check for common issues

#### How to Modify Subreddits
1. Open `subreddits.txt` in the project root
2. Add one subreddit per line (without the `r/` prefix)
3. Use `#` at the start of a line for comments
4. Run `npm run generate-subreddits` to regenerate the TypeScript file
5. Run `npm run build` to build with the new subreddits (this automatically runs generate-subreddits)

#### Validation
Run `node validate-subreddits.js` to check your subreddits.txt file for common issues like:
- Subreddit names with `r/` prefix
- Names containing spaces or slashes
- Mixed case names (suggests lowercase)

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run check`: Type checks, lints, and prettifies your app
