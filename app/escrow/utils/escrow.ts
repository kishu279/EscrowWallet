/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/escrow.json`.
 */
export type EscrowProgram = {
  address: "DCA5tgdnUxARGKY1oYpcnLkzeuxYaKSiXMMJ3irou6tu";
  metadata: {
    name: "escrow";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "claimEscrow";
      discriminator: [200, 80, 182, 159, 61, 75, 9, 205];
      accounts: [
        {
          name: "escrow";
          writable: true;
        },
        {
          name: "receiver";
          writable: true;
          signer: true;
          relations: ["escrow"];
        },
        {
          name: "initializer";
          writable: true;
          relations: ["escrow"];
        },
        {
          name: "initializerVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  105,
                  110,
                  105,
                  116,
                  105,
                  97,
                  108,
                  105,
                  122,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "escrow";
              }
            ];
          };
        },
        {
          name: "receiverVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  114,
                  101,
                  99,
                  101,
                  105,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "escrow";
              }
            ];
          };
        },
        {
          name: "initializerVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "initializerVaultAuthority";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "initializerMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "receiverVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "receiverVaultAuthority";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "receiverMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "receiverTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "receiver";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "receiverMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "initializerVaultToReceiverTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "receiver";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "initializerMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "receiverVaultToInitializerTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "initializer";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "receiverMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "feeCollectorTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "feeCollector";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "initializerMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "feeCollector";
          writable: true;
          relations: ["escrow"];
        },
        {
          name: "initializerMint";
          writable: true;
          relations: ["escrow"];
        },
        {
          name: "receiverMint";
          writable: true;
          relations: ["escrow"];
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        },
        {
          name: "eventAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ];
              }
            ];
          };
        },
        {
          name: "program";
        }
      ];
      args: [];
    },
    {
      name: "initializeEscrow";
      discriminator: [243, 160, 77, 153, 11, 92, 48, 209];
      accounts: [
        {
          name: "escrow";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [101, 115, 99, 114, 111, 119];
              },
              {
                kind: "account";
                path: "initializer";
              }
            ];
          };
        },
        {
          name: "initializer";
          writable: true;
          signer: true;
        },
        {
          name: "initializerTokenAccount";
          writable: true;
        },
        {
          name: "initializerVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  105,
                  110,
                  105,
                  116,
                  105,
                  97,
                  108,
                  105,
                  122,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "escrow";
              }
            ];
          };
        },
        {
          name: "initializerVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "initializerVaultAuthority";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "initializerMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "receiverVaultAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  114,
                  101,
                  99,
                  101,
                  105,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "escrow";
              }
            ];
          };
        },
        {
          name: "receiverVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "receiverVaultAuthority";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "receiverMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "initializerMint";
        },
        {
          name: "receiverMint";
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "eventAuthority";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ];
              }
            ];
          };
        },
        {
          name: "program";
        }
      ];
      args: [
        {
          name: "initilaizerAmount";
          type: "u64";
        },
        {
          name: "recieverAmount";
          type: "u64";
        },
        {
          name: "expiry";
          type: "i64";
        },
        {
          name: "receiver";
          type: "pubkey";
        },
        {
          name: "feeBasisPoint";
          type: "u16";
        },
        {
          name: "feeCollector";
          type: "pubkey";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "escrow";
      discriminator: [31, 213, 123, 187, 186, 22, 218, 155];
    }
  ];
  events: [
    {
      name: "escrowClaimedEvent";
      discriminator: [102, 255, 155, 116, 206, 56, 249, 241];
    },
    {
      name: "escrowInitializedEvent";
      discriminator: [17, 220, 22, 132, 33, 81, 105, 59];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "escrowNotInitialized";
      msg: "Escrow is not initialized";
    },
    {
      code: 6001;
      name: "escrowExpired";
      msg: "Escrow is expired";
    },
    {
      code: 6002;
      name: "invalidFeeCollector";
      msg: "Invalid Fee Collector";
    }
  ];
  types: [
    {
      name: "escrow";
      type: {
        kind: "struct";
        fields: [
          {
            name: "initializer";
            type: "pubkey";
          },
          {
            name: "receiver";
            type: "pubkey";
          },
          {
            name: "initializerMint";
            type: "pubkey";
          },
          {
            name: "initializerAmount";
            type: "u64";
          },
          {
            name: "receiverMint";
            type: "pubkey";
          },
          {
            name: "receiverAmount";
            type: "u64";
          },
          {
            name: "feeBasisPoints";
            type: "u16";
          },
          {
            name: "feeCollector";
            type: "pubkey";
          },
          {
            name: "expiry";
            type: "i64";
          },
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "initializerVaultBump";
            type: "u8";
          },
          {
            name: "receiverVaultBump";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "escrowClaimedEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "initializer";
            type: "pubkey";
          },
          {
            name: "receiver";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "expiry";
            type: "i64";
          }
        ];
      };
    },
    {
      name: "escrowInitializedEvent";
      type: {
        kind: "struct";
        fields: [
          {
            name: "initializer";
            type: "pubkey";
          },
          {
            name: "receiver";
            type: "pubkey";
          },
          {
            name: "mint";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "expiry";
            type: "i64";
          }
        ];
      };
    }
  ];
};
