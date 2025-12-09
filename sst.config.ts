/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input: any) {
    return {
      name: "nfty-title-agent",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const titleHandler = new sst.aws.Function("TitleHandler", {
      handler: "src/handlers/title.handler",
      url: true,
      environment: {
        CUSTOM_AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
        CUSTOM_AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
        CUSTOM_AWS_REGION: process.env.AWS_REGION || "us-east-1",
      },
      permissions: [
        {
          actions: ["bedrock:InvokeModel"],
          resources: ["*"],
        },
        {
          actions: [
            "dynamodb:GetItem",
            "dynamodb:Query",
          ],
          resources: [
            "arn:aws:dynamodb:us-east-1:044450715524:table/test-data"
          ],
        },
      ],
    });

    return {
      url: titleHandler.url,
    };
  },
});