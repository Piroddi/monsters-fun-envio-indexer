# Monsters.fun Envio indexer

*Please refer to the [documentation website](https://docs.envio.dev) for a thorough guide on all [Envio](https://envio.dev) indexer features*

## Run

```bash
pnpm envio dev
```

## Pre-requisites

- [Node.js (use v18 or newer)](https://nodejs.org/en/download/current)
- [pnpm (use v8 or newer)](https://pnpm.io/installation)
- [Docker desktop](https://www.docker.com/products/docker-desktop/)

## Example queries

Visit http://localhost:8080 to see the GraphQL Playground, local password is `testing`.

## Get Trade

```graphql
query MyQuery {
  Trade {
    isBuy
		amount
		ethAmount
		id
		token
		trader
  }
}
```




## Deploying an indexer to the hosted service
 - Login with GitHub
 - Select an organisation or your personal GitHub user profile
 - Install the Envio Deployments GitHub app
 - Add & configure your indexer
 - Create a deployment branch (envio by default)
 - Deploy your indexer via git
 ``` bash  
    git push
```

## Limits
 - Developers can deploy 3 indexers per organisation and 3 deployments per indexer. Deployments can be deleted in the hosted service to make space for more deployments.

