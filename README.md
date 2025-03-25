# Monsters.fun Envio indexer

*Please refer to the [documentation website](https://docs.envio.dev) for a thorough guide on all [Envio](https://envio.dev) indexer features*

## Run

```bash
pnpm dev
```

## Generate files from `config.yaml` or `schema.graphql`

```bash
pnpm codegen
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
    tradeType
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
    name
    symbol
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

### Traders points

```graphql
query MyQuery {
  Trader {    
    points
  }
}
```

### Traders trades

```graphql
query MyQuery {
  Trader {
    id    
    trades {
      tradeType
      amount
      token
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
  }
}

```

### 24 hour total volume traded queries

#### Current total volume traded
```graphql
query MyQuery {
  Monster(where: {id: {_eq: "0xEcE0d869b88fb1Daf726609990C8244d2b9A400D"}}) {
    id
    totalVolumeTraded
  }
}
```

#### 24 hours ago total volume traded
```graphql
query MyQuery {
  TotalVolumeTradedSnapshot(where: {monster: {_eq: "0xEcE0d869b88fb1Daf726609990C8244d2b9A400D"}, _and: {timestamp: {_lte: "$timestampOf24HoursAgo"}}}, limit: 1, order_by: {timestamp: desc}) {
    totalVolumeTraded    
  }
}
```

### Monster win / lose ratio

#### Current win / lose ratio
```graphql
query MyQuery {
  Monster(where: {id: {_eq: "0xEcE0d869b88fb1Daf726609990C8244d2b9A400D"}}) {
    id
    winLoseRatio
  }
}
```

### Traders current holdings

- Current market cap: For each monster sum the marketCap

```graphql
query MyQuery {
  Trader {
    id
    holdings {
      marketCap
    }
  }
}
```

- 24 Hours ago market cap: For each monster sum the marketCap

```graphql
query MyQuery {
  Monster {
    id
  }
}
```

```graphql
query MyQuery {
  Trader(where: {id: {_eq: "0x8c0686723804A0B7201151852C94Bd17DD043C21"}}) {
    id
    holdingsSnapshots(where: {timestamp: {_lte: 1741371238}, _and: {monster_id: {_eq: "0xEcE0d869b88fb1Daf726609990C8244d2b9A400D"}}}, limit: 1, order_by: {timestamp: desc}) {
      marketCap
      monster {
        id
      }
    }
  }
}

```

#### Traders lifetime pnl per monster calc

Where absolute profit = total holdings sales value - (total holdings cost value - current holdings value)
Where absolute profit = totalHoldingsSales - (totalHoldingsCost - marketCap) 
A negative value indicating a loss

```graphql
query MyQuery {
  Trader {
    id
    holdings {
      totalHoldingsCost
      totalHoldingsSales
      marketCap
    }
  }
}
```

