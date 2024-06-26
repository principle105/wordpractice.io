module.exports = {
    apps: [
        {
            name: "wp-web",
            script: "npm start",
            watch: true,
            env: {
                PORT: 3000,
                NODE_ENV: "production",
                BASE_URL: process.env.BASE_URL,
                MONGODB_CONNECTION_URI: process.env.MONGODB_CONNECTION_URI,
                GH_CLIENT_ID: process.env.GH_CLIENT_ID,
                GH_CLIENT_SECRET: process.env.GH_CLIENT_SECRET,
                DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
                DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
                GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
                GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
            },
        },
    ],
};
