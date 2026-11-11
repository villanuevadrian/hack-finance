CI: `ci.yml` tiene dos trabajos en cada PR y en cada push a `main`: backend (`make setup`, `make lint`, `make test`) y frontend (`make setup-web`, `make test-web`: tests, lint y build).
