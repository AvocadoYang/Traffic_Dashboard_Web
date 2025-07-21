export type Err = {
  response: {
    data: {
      message: string;
    };
    status: number;
  };
};

export type ErrorOrigin = {
  response: {
    data: string;
    status: number;
  };
};
