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

### Get Trade

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

### Monster information

```graphql
query MyQuery {
  Monster {
    id
    marketCap
    price
    supply
    experiencePoints
  }
}
```

### Traders holdings

```graphql
query MyQuery {
  Trader {
    id
    numberOfTrades
    holdings {
      balance      
      monster
    }
  }
}
```

### 24 hour market cap change queries

#### Current market cap
```graphql
query MyQuery {
  Monster(where: {id: {_eq: "0xEcE0d869b88fb1Daf726609990C8244d2b9A400D"}}) {
    id
    marketCap
  }
}

```

#### 24 hours ago market cap
```graphql
query MyQuery {
  MarketCapSnapshot(where: {monster: {_eq: "0xEcE0d869b88fb1Daf726609990C8244d2b9A400D"}, _and: {timestamp: {_lte: "$timestampOf24HoursAgo"}}}, limit: 1, order_by: {timestamp: desc}) {
    marketCap
    timestamp
  }
}

```