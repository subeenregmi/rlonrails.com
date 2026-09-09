# [rlonrails.com](https://rlonrails.com)

![RL on Rails](docs/screenshot.png)

## Deployment

Local
```sh
make up
```

Production — [rlonrails.com](https://rlonrails.com), tracks `main`
```sh
make deploy
```

Development — [dev.rlonrails.com](https://dev.rlonrails.com), tracks `development`
```sh
make deploy-dev
```

`deploy` and `deploy-dev` each reset the checkout to their branch, so they are
run from separate clones. On the home server that is the `rlonrails.com` and
`dev.rlonrails.com` submodules of
[docker-containers](https://github.com/subeenregmi/docker-containers).
