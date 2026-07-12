<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Don't test the UI yourself

Do not start a dev server, curl routes, or drive the browser to verify UI changes in this repo. The user runs and checks the app themselves. Rely on `tsc --noEmit` and `npm run lint` for verification, and describe what to check manually instead of trying to check it yourself.
