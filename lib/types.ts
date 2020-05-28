import Serverless from "serverless";

export type SwiftOptions =
  | {
      [key: string]: string;
    }
  | undefined;

export type SwiftFunctionDefinition = Serverless.FunctionDefinition & {
  layers?: any[];
  swift?: SwiftOptions;
};

export type Layer = {
  name?: string;
  description?: string;
  licenseInfo?: string;
  compatibleRuntimes?: string;
  retain?: boolean;
  allowedAccounts?: string[];
  package?: {
    artifact?: string;
  };
};

export type ServerlessExtended = Serverless & {
  service: {
    layers?: { [key: string]: Layer };
    getLayers?: (arg0: string) => Layer;
    getAllLayers?: () => Layer[];
    provider?: {
      naming?: {
        getLambdaLayerLogicalId?: (arg0: string) => string;
      };
    };
  };
};
