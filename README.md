<div align="center">
    <img src="https://i.imgur.com/zuEi84v.png" alt="Logo" width="240" height="240">
    <h1>wordpractice.io</h1>
    <p>Practice your typing skills while having fun, compete with typists from around the world.</p>
    <a href="https://discord.gg/DHnk46C">
        <img src="https://img.shields.io/discord/742960643312713738?logo=discord&style=for-the-badge"></img>
    </a>
</div>

## Local Development

### Setup

1. Install [Node.js 20.x.x](https://nodejs.org/en) and [PNPM](https://pnpm.io/installation)
2. Clone the repository locally.
    ```shell
    git clone https://github.com/principle105/wordpractice.io
    ```
3. Install the dependencies.
    ```shell
    pnpm i
    ```
4. Create a `.env` file in the root directory of the repository.
5. Copy the content from `.env.example` into `.env` and fill it with the necessary information.

### Usage

To start the development server, run

```shell
pnpm run dev
```

## Production

To build the project for production, run

```shell
pnpm run build
```

To start the production server, run

```shell
pnpm start
```
