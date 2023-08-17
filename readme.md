<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/burner.png">
  <img alt="Dojo logo" width="120" src=".github/burner.png">
</picture>

---

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/mark-dark.svg">
  <img alt="Dojo logo" align="right" width="120" src=".github/mark-light.svg">
</picture>

<a href="https://twitter.com/dojostarknet">
<img src="https://img.shields.io/twitter/follow/dojostarknet?style=social"/>
</a>
<a href="https://github.com/dojoengine/dojo">
<img src="https://img.shields.io/github/stars/dojoengine/dojo?style=social"/>
</a>

[![discord](https://img.shields.io/badge/join-dojo-green?logo=discord&logoColor=white)](https://discord.gg/PwDa2mKhR4)
[![Telegram Chat][tg-badge]][tg-url]

[tg-badge]: https://img.shields.io/endpoint?color=neon&logo=telegram&label=chat&style=flat-square&url=https%3A%2F%2Ftg.sumanjay.workers.dev%2Fdojoengine
[tg-url]: https://t.me/dojoengine

> Note: Starknet Burner Accounts are currently in alpha. Expect breaking changes frequently.

## Starknet Burner Accounts

Simple way to create a burner wallet for Starknet.

### How does it work?

Burner wallet is simply a Starknet account that is created on the fly and is funded with some amount of funds. The keypair is stored in local browser storage, which allows for signature free transactions - essential for onchain games.

This library provides a basic hook for creating and managing burner wallets. It is up to the developer to decide how to fund the burner wallet and how to manage the funds.

> Warning: You should provide your users with warning explaning that these Accounts are not secure and should not be used for storing large amounts of funds. The keypair is stored in local storage and can be exploited by malicious actors.


### Install

`yarn add @dojoengine/create-burner starknet`

### Create

```js
import { useBurner } from "@dojoengine/create-burner"
import { Account, Provider } from "starknet"

const provider = new Provider({
  sequencer: {
    baseUrl: 'https://alpha4.starknet.io',
  }
});

const ADDRESS = "0x3ee9e18edc71a6df30ac3aca2e0b02a198fbce19b7480a63a0d71cbd76652e0"
const PRIVATE_KEY = "0x3ee9e18edc71a6df30ac3aca2e0b02a198fbce19b7480a63a0d71cbd76652e0"
const ACCOUNT_CLASS_HASH = "0x006280083f8c2a2db9f737320d5e3029b380e0e820fe24b8d312a6a34fdba0cd"

const masterAccount = new Account(provider, ADDRESS, PRIVATE_KEY)

const { create } = useBurner({ 
        masterAccount: masterAccount, 
        accountClassHash: ACCOUNT_CLASS_HASH,
        provider: provider
        });
```