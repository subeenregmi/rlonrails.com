# [rlonrails.com](https://rlonrails.com)

![RL on Rails](docs/screenshot.png)

## Browser regression tests

```sh
npx playwright install chromium webkit
npm run test:browser
```

The tests build and serve the production app, seed 60 read stations in an
isolated browser profile, and check zoom anchoring, clicks during zoom, panning,
and touch pinching. This keeps saved progress and build mode consistent when
comparing local rendering with the development site.

## Linting and formatting

```sh
npm run lint
npm run lint:fix
```

Biome lints and formats TypeScript, CSS and JSON against the strict rules in
`biome.json`, including its Next.js, React and Tailwind checks. `lint:fix`
applies safe fixes, sorts imports and Tailwind classes, and formats. Pull
requests and deploys run `npm run lint:ci`, which fails on warnings, so `main`
only deploys once the check passes.

## Deployment

Local
```sh
make up
```

Production — [rlonrails.com](https://rlonrails.com), tracks the newest stable
`v*` tag
```sh
make deploy
```

Development — [dev.rlonrails.com](https://dev.rlonrails.com), tracks `main`
```sh
make deploy-dev
```

Merging to `main` refreshes the development site. Publishing a release moves
production to that tag; pre-releases (`v2.0.0-rc1`) are skipped, so production
only ever lands on a stable one.

Both events reach the homeserver through the same fixed SSH command, so
`deploy` sets production and then hands off to the development checkout beside
it (`DEV_CHECKOUT`, default `../dev.rlonrails.com`). The two targets reset
their checkout to different refs, so they need separate clones — on the
homeserver those are the `rlonrails.com` and `dev.rlonrails.com` submodules of
[docker-containers](https://github.com/subeenregmi/docker-containers).
