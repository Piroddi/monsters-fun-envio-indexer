# Monsters.fun Envio indexer

new deplou

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

## Deployment

[Envio's hosted service](https://envio.dev/explorer) is tightly integrated with github. 
To deploy this indexer:
- Login to [envio.dev/app/login](envio.dev/app/login)
- Add your github organisation
- Connect your repo (likely a fork of this repo) 
- Configure the indexer settings
- Select your plan and follow stripe payment instructions
- Push to deploy based on your specified branch

For a more detailed guide on how to deploy an indexer, please refer to the [documentation website](https://docs.envio.dev/docs/HyperIndex/hosted-service-deployment).

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
    isInBattle
    activeOpponent
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

- Current market cap: For each monster get the current price & multiply by traders current holdings balance

```graphql
query MyQuery {
  Monster {
    id
    price
  }
}
```

```graphql
query MyQuery {
  Trader {
    id
    holdings {
      monster {
        id
      }
      balance
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

#### Traders whitelist purchase amount in eth in the last 24 hours

Take the sum of the ethAmountPurchased for all the whitelistPurchaseSnapshots where the timestamp is greater than the current timestamp minus 24 hours

> Note: In the rare case the user has done > 1000 whitelist purchases in the last 24 hour period, this query will need to be paginated ie set offset and limit and fetch data in 1000 data points per request. Since this is a very odd occurrence, you could inaccurately assume that if a user has done > 1000 whitelist purchases in the last 24 hours that they have exceeded the 0.1 eth limit.


```graphql
query MyQuery {
  WhitelistPurchaseSnapshot(where: {trader: {_eq: "0x8c0686723804A0B7201151852C94Bd17DD043C21"}, _and: {monster_id: {_eq: "0x8Bd6e4fa6D9cc89656dC20A3F092C03BD9543FB7"}, _and: {timestamp: {_gt: $nowLess24Hours}}}}) {
    ethAmountPurchased
    trader
    monster_id
  }
}
```

#### Price snapshots for pricing graphs

The below query may need to be modified slightly (paginated, gt timestamp etc)

```graphql
query MyQuery {
  PriceSnapShot(where: {monster: {_eq: "0xEcE0d869b88fb1Daf726609990C8244d2b9A400D"}}, order_by: {timestamp: desc}) {
    timestamp
    price    
  }
}
