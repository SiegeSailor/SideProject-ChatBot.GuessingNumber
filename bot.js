// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const Config = {
  NewLine: '\r\n',
  CommandSet: 'set',
  CommandGuess: 'guess',
  CommandStatus: 'status',
  CommandClear: 'clear',
  CommandHelp: 'help',
  FormatItalic: 'italic',
  FormatBold: 'bold',
};

class EchoBot extends ActivityHandler {
  CurrentNumber = [];
  History = [];

  constructor() {
    super();
    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.CurrentNumber = [];
    this.History = [];

    this.onMessage(async (context, next) => {
      const {
        text,
        timestamp,
        from: { name },
      } = context.activity;

      if (
        text.split(' ').reduce((accumulator, currentValue) => {
          if (Object.values(Config).includes(currentValue)) accumulator = accumulator + 1;
          return accumulator;
        }, 0) > 1
      ) {
        await context.sendActivity(MessageFactory.text('不可同時輸入多個指令。', '不可同時輸入多個指令。'));
        await next();
        return;
      }

      if (text.includes(Config.CommandGuess)) {
        const [_, guessNumber] = text.split(' ');

        try {
          this.verifyCurrent();
          this.verifyInput(guessNumber);
        } catch (error) {
          await context.sendActivity(MessageFactory.text(error.message));
          await next();
          return;
        }

        const listOfGuessNumber = guessNumber.split('');
        const { a, b } = listOfGuessNumber.reduce(
          (accumulator, currentValue) => {
            if (this.CurrentNumber.indexOf(currentValue) === listOfGuessNumber.indexOf(currentValue)) {
              accumulator.a = accumulator.a + 1;
            } else if (this.CurrentNumber.includes(currentValue)) {
              accumulator.b = accumulator.b + 1;
            }

            return accumulator;
          },
          { a: 0, b: 0 }
        );
        const result = `${a}A${b}B`;

        this.addHistory({ timestamp, name, guess: guessNumber, result });

        if (a === 4) {
          await context.sendActivity(
            MessageFactory.text(
              `${result}！恭喜猜到正確答案${this.formatMessage(Config.FormatItalic, this.CurrentNumber.join(''))}。使用${this.createCommand(Config.CommandSet)}進行下一輪遊戲。`,
              `${result}！恭喜猜到正確答案${this.formatMessage(Config.FormatItalic, this.CurrentNumber.join(''))}。使用${this.createCommand(Config.CommandSet)}進行下一輪遊戲。`
            )
          );
          this.clear();
          await next();
          return;
        }

        await context.sendActivity(MessageFactory.text(result, result));
      }

      switch (text) {
        case Config.CommandSet:
          try {
            if (this.CurrentNumber.length > 0) throw Error(`已設定目標數字。若要重新開始，請使用${this.createCommand(Config.CommandSet)}。`);
          } catch (error) {
            await context.sendActivity(MessageFactory.text(error.message));
            await next();
            return;
          }
          const newNumber = [];
          for (let i = 0; i < 4; i = i + 1) {
            let randomNumber = '';
            while (!randomNumber || newNumber.includes(randomNumber) || (newNumber.length === 0 && randomNumber === '0')) {
              randomNumber = String(Math.floor(Math.random() * 9));
            }
            newNumber.push(randomNumber);
          }
          this.CurrentNumber = newNumber;
          this.addHistory({ timestamp, name, guess: undefined, result: '設定了目標數字。' });
          await context.sendActivity(MessageFactory.text(`成功設定目標數字。`, `成功設定目標數字。`));
          break;
        case Config.CommandStatus:
          try {
            this.verifyCurrent();
          } catch (error) {
            await context.sendActivity(MessageFactory.text(error.message));
            await next();
            return;
          }

          await context.sendActivity(MessageFactory.text(this.createHistoryText('目前遊戲狀態：'), this.createHistoryText('目前遊戲狀態：')));
          break;
        case Config.CommandClear:
          try {
            this.verifyCurrent();
          } catch (error) {
            await context.sendActivity(MessageFactory.text(error.message));
            await next();
            return;
          }

          await context.sendActivity(MessageFactory.text(this.createHistoryText('這局遊戲紀錄：'), this.createHistoryText('這局遊戲紀錄：')));
          await context.sendActivity(
            MessageFactory.text(
              `答案是 ${this.formatMessage(Config.FormatItalic, this.CurrentNumber.join(''))}。請輸入${this.createCommand(Config.CommandSet)}開始新一輪遊戲。`,
              `答案是 ${this.formatMessage(Config.FormatItalic, this.CurrentNumber.join(''))}。請輸入${this.createCommand(Config.CommandSet)}開始新一輪遊戲。`
            )
          );
          this.clear();
          break;
        case Config.CommandHelp:
          try {
            await context.sendActivity(
              MessageFactory.text(
                [
                  `開始新一輪遊戲，使用${this.createCommand(Config.CommandSet)}設定目標數字。設定後，使用${this.createCommand(Config.CommandGuess)}猜數字。`,
                  `要查看現在狀態，輸入${this.createCommand(Config.CommandStatus)}查看，或者輸入${this.createCommand(Config.CommandClear)}公布答案並清空狀態。`,
                  `輸入${this.createCommand(Config.CommandHelp)}再次查看以上指令。`,
                ].join(Config.NewLine),
                [
                  `開始新一輪遊戲，使用${this.createCommand(Config.CommandSet)}設定目標數字。設定後，使用${this.createCommand(Config.CommandGuess)}猜數字。`,
                  `要查看現在狀態，輸入${this.createCommand(Config.CommandStatus)}查看，或者輸入${this.createCommand(Config.CommandClear)}公布答案並清空狀態。`,
                  `輸入${this.createCommand(Config.CommandHelp)}再次查看以上指令。`,
                ].join(Config.NewLine)
              )
            );
          } catch (error) {
            await context.sendActivity(MessageFactory.text(`遇到 ${error.message} 錯誤，請回報給 Ken.Zhang。`));
          }
          break;
      }

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;

      for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
        if (membersAdded[cnt].id !== context.activity.recipient.id) {
          await context.sendActivity(
            MessageFactory.text(`請輸入${this.createCommand(Config.CommandHelp)}瞭解如何遊戲。`, `請輸入${this.createCommand(Config.CommandHelp)}瞭解如何遊戲。`)
          );
        }
      }
      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });
  }

  formatMessage = (style, input, noSpace = false) => {
    let string = '';
    switch (style) {
      case Config.FormatBold:
        string = ` **${input}** `;
        break;
      case Config.FormatItalic:
        string = ` *${input}* `;
        break;
    }

    return noSpace ? string.trim() : string;
  };

  createCommand = (command) => {
    switch (command) {
      case Config.CommandGuess:
        return `${this.formatMessage(Config.FormatBold, command)}${this.formatMessage(Config.FormatItalic, 'number', true)} `;
      case Config.CommandSet:
      case Config.CommandStatus:
      case Config.CommandClear:
      case Config.CommandHelp:
      default:
        return `${this.formatMessage(Config.FormatBold, command)}`;
    }
  };

  addHistory = (config) => {
    if (!Object.keys(config).every((key) => ['timestamp', 'name', 'guess', 'result'].includes(key))) throw Error('History 格式錯誤。');
    this.History.push(config);
  };

  verifyInput = (inputNumber) => {
    if (!inputNumber) throw Error('請輸入 4 位不重複且開頭不為 0 的數字。');
    if (!/^\d+$/.test(inputNumber)) throw Error('只能輸入數字。');
    if (inputNumber.length !== 4) throw Error('必須為 4 位數字。');
    if (inputNumber[0] === '0') throw Error('第一個數字不可為 0。');
    if (inputNumber.split('').some((integer, index) => inputNumber.split('').indexOf(integer) !== index)) throw Error('不可有重複的數字。');
  };

  verifyCurrent = () => {
    if (this.CurrentNumber.length === 0) throw Error('尚未設定目標數字。');
    if (this.History.length === 0) throw Error(`尚未有人開始猜數字，請使用${this.createCommand(Config.CommandGuess)}進行遊戲。`);
  };

  createHistoryText = (start) =>
    [
      start,
      ...this.History.map(({ timestamp, name, guess, result }) => {
        const readableTimestamp = `${new Date(timestamp).toLocaleString()}：`;
        if (!guess) {
          return `${readableTimestamp}${name} ${result}`;
        } else {
          return `${readableTimestamp}${name} 猜了${this.formatMessage(Config.FormatItalic, guess)}。結果是${this.formatMessage(Config.FormatBold, result)}。`;
        }
      }),
    ].join(Config.NewLine);

  clear = () => {
    this.CurrentNumber = [];
    this.History = [];
  };
}

module.exports.EchoBot = EchoBot;

// SIG // Begin signature block
// SIG // MIInJwYJKoZIhvcNAQcCoIInGDCCJxQCAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // Ob7KGRKcpsQeZeomf5Qo/JN1O2IaZx3TkaHBl3ahHamg
// SIG // ghFlMIIIdzCCB1+gAwIBAgITNgAAATl4xjn15Xcn6gAB
// SIG // AAABOTANBgkqhkiG9w0BAQsFADBBMRMwEQYKCZImiZPy
// SIG // LGQBGRYDR0JMMRMwEQYKCZImiZPyLGQBGRYDQU1FMRUw
// SIG // EwYDVQQDEwxBTUUgQ1MgQ0EgMDEwHhcNMjAxMDIxMjAz
// SIG // OTA2WhcNMjEwOTE1MjE0MzAzWjAkMSIwIAYDVQQDExlN
// SIG // aWNyb3NvZnQgQXp1cmUgQ29kZSBTaWduMIIBIjANBgkq
// SIG // hkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr7X+kRvV9WxV
// SIG // y0Dsy7gNOpOYAYYsy1kN/5upyCjsKDbLvTfrPcrfmRka
// SIG // W2Ww7QZrQHqIt3Nlyvb39Md7Kt9hljz7/qcemu7uebUP
// SIG // ZauHr1+kDcT4ax/vpbZVLbIolZlfd+P/heQf+9bCdTca
// SIG // /PTrBMVdW+RMuy4ipBMMaU0cZTslF3+DokL0w8xtCOwL
// SIG // HieEcTstt7S54fNuvKZLnGNj20ixWKESBtWRjYHIXKay
// SIG // /rokS7gs+L2V34nUKFrrN04WPPpmLpQ/AGkOWbZ7sM0h
// SIG // 7c8WJv4Ojnkg7H+MRXqdA2CwN8zYijuAr5szUYyW3INQ
// SIG // ZuzqQ3vwki0lhuWqKlvl+QIDAQABo4IFgzCCBX8wKQYJ
// SIG // KwYBBAGCNxUKBBwwGjAMBgorBgEEAYI3WwEBMAoGCCsG
// SIG // AQUFBwMDMD0GCSsGAQQBgjcVBwQwMC4GJisGAQQBgjcV
// SIG // CIaQ4w2E1bR4hPGLPoWb3RbOnRKBYIPdzWaGlIwyAgFk
// SIG // AgEMMIICdgYIKwYBBQUHAQEEggJoMIICZDBiBggrBgEF
// SIG // BQcwAoZWaHR0cDovL2NybC5taWNyb3NvZnQuY29tL3Br
// SIG // aWluZnJhL0NlcnRzL0JZMlBLSUNTQ0EwMS5BTUUuR0JM
// SIG // X0FNRSUyMENTJTIwQ0ElMjAwMSgxKS5jcnQwUgYIKwYB
// SIG // BQUHMAKGRmh0dHA6Ly9jcmwxLmFtZS5nYmwvYWlhL0JZ
// SIG // MlBLSUNTQ0EwMS5BTUUuR0JMX0FNRSUyMENTJTIwQ0El
// SIG // MjAwMSgxKS5jcnQwUgYIKwYBBQUHMAKGRmh0dHA6Ly9j
// SIG // cmwyLmFtZS5nYmwvYWlhL0JZMlBLSUNTQ0EwMS5BTUUu
// SIG // R0JMX0FNRSUyMENTJTIwQ0ElMjAwMSgxKS5jcnQwUgYI
// SIG // KwYBBQUHMAKGRmh0dHA6Ly9jcmwzLmFtZS5nYmwvYWlh
// SIG // L0JZMlBLSUNTQ0EwMS5BTUUuR0JMX0FNRSUyMENTJTIw
// SIG // Q0ElMjAwMSgxKS5jcnQwUgYIKwYBBQUHMAKGRmh0dHA6
// SIG // Ly9jcmw0LmFtZS5nYmwvYWlhL0JZMlBLSUNTQ0EwMS5B
// SIG // TUUuR0JMX0FNRSUyMENTJTIwQ0ElMjAwMSgxKS5jcnQw
// SIG // ga0GCCsGAQUFBzAChoGgbGRhcDovLy9DTj1BTUUlMjBD
// SIG // UyUyMENBJTIwMDEsQ049QUlBLENOPVB1YmxpYyUyMEtl
// SIG // eSUyMFNlcnZpY2VzLENOPVNlcnZpY2VzLENOPUNvbmZp
// SIG // Z3VyYXRpb24sREM9QU1FLERDPUdCTD9jQUNlcnRpZmlj
// SIG // YXRlP2Jhc2U/b2JqZWN0Q2xhc3M9Y2VydGlmaWNhdGlv
// SIG // bkF1dGhvcml0eTAdBgNVHQ4EFgQUUGrH1hbhlmeE4x4+
// SIG // xNBviWC5XYMwDgYDVR0PAQH/BAQDAgeAMFAGA1UdEQRJ
// SIG // MEekRTBDMSkwJwYDVQQLEyBNaWNyb3NvZnQgT3BlcmF0
// SIG // aW9ucyBQdWVydG8gUmljbzEWMBQGA1UEBRMNMjM2MTY3
// SIG // KzQ2MjUxNjCCAdQGA1UdHwSCAcswggHHMIIBw6CCAb+g
// SIG // ggG7hjxodHRwOi8vY3JsLm1pY3Jvc29mdC5jb20vcGtp
// SIG // aW5mcmEvQ1JML0FNRSUyMENTJTIwQ0ElMjAwMS5jcmyG
// SIG // Lmh0dHA6Ly9jcmwxLmFtZS5nYmwvY3JsL0FNRSUyMENT
// SIG // JTIwQ0ElMjAwMS5jcmyGLmh0dHA6Ly9jcmwyLmFtZS5n
// SIG // YmwvY3JsL0FNRSUyMENTJTIwQ0ElMjAwMS5jcmyGLmh0
// SIG // dHA6Ly9jcmwzLmFtZS5nYmwvY3JsL0FNRSUyMENTJTIw
// SIG // Q0ElMjAwMS5jcmyGLmh0dHA6Ly9jcmw0LmFtZS5nYmwv
// SIG // Y3JsL0FNRSUyMENTJTIwQ0ElMjAwMS5jcmyGgbpsZGFw
// SIG // Oi8vL0NOPUFNRSUyMENTJTIwQ0ElMjAwMSxDTj1CWTJQ
// SIG // S0lDU0NBMDEsQ049Q0RQLENOPVB1YmxpYyUyMEtleSUy
// SIG // MFNlcnZpY2VzLENOPVNlcnZpY2VzLENOPUNvbmZpZ3Vy
// SIG // YXRpb24sREM9QU1FLERDPUdCTD9jZXJ0aWZpY2F0ZVJl
// SIG // dm9jYXRpb25MaXN0P2Jhc2U/b2JqZWN0Q2xhc3M9Y1JM
// SIG // RGlzdHJpYnV0aW9uUG9pbnQwHwYDVR0jBBgwFoAUG2ai
// SIG // Gfyb66XahI8YmOkQpMN7kr0wHwYDVR0lBBgwFgYKKwYB
// SIG // BAGCN1sBAQYIKwYBBQUHAwMwDQYJKoZIhvcNAQELBQAD
// SIG // ggEBAKxTTHwCUra3f91eISJ03YxKPwi2AGPGF/36BgJs
// SIG // pOja4xMd7hTdLCZkd6kdIgYIEt0gYlIuKGfl5PPg41Z5
// SIG // yRZ/RYZrv5AdsE+GSo442XlkTj3E7FJ0YLNfjoSk1m19
// SIG // hJ4PKB9wqtKkfS2jk/xEuRI3ffEtY6ulmfAfCnTR4NHf
// SIG // lRgLcLbPhN7rvDJFDOa1LpJjx1uwQvLbZoCnl2YiIi1e
// SIG // E9Ss8QTDDYNJWO4hW0OX5I+YS2tRNFr7BjHDBjjMEVFc
// SIG // FcJehfDi/GlGOYu7aQLs+eF1UuFtYKz8kyQ2ntagdfR+
// SIG // Sb6k8DzzZt9CaxRqUf1/0hkIUTrKA+FdbbwifLQwggjm
// SIG // MIIGzqADAgECAhMfAAAAFLTFH8bygL5xAAAAAAAUMA0G
// SIG // CSqGSIb3DQEBCwUAMDwxEzARBgoJkiaJk/IsZAEZFgNH
// SIG // QkwxEzARBgoJkiaJk/IsZAEZFgNBTUUxEDAOBgNVBAMT
// SIG // B2FtZXJvb3QwHhcNMTYwOTE1MjEzMzAzWhcNMjEwOTE1
// SIG // MjE0MzAzWjBBMRMwEQYKCZImiZPyLGQBGRYDR0JMMRMw
// SIG // EQYKCZImiZPyLGQBGRYDQU1FMRUwEwYDVQQDEwxBTUUg
// SIG // Q1MgQ0EgMDEwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw
// SIG // ggEKAoIBAQDVV4EC1vn60PcbgLndN80k3GZh/OGJcq0p
// SIG // DNIbG5q/rrRtNLVUR4MONKcWGyaeVvoaQ8J5iYInBaBk
// SIG // az7ehYnzJp3f/9Wg/31tcbxrPNMmZPY8UzXIrFRdQmCL
// SIG // sj3LcLiWX8BN8HBsYZFcP7Y92R2VWnEpbN40Q9XBsK3F
// SIG // aNSEevoRzL1Ho7beP7b9FJlKB/Nhy0PMNaE1/Q+8Y9+W
// SIG // bfU9KTj6jNxrffv87O7T6doMqDmL/MUeF9IlmSrl088b
// SIG // oLzAOt2LAeHobkgasx3ZBeea8R+O2k+oT4bwx5ZuzNpb
// SIG // GXESNAlALo8HCf7xC3hWqVzRqbdnd8HDyTNG6c6zwyf/
// SIG // AgMBAAGjggTaMIIE1jAQBgkrBgEEAYI3FQEEAwIBATAj
// SIG // BgkrBgEEAYI3FQIEFgQUkfwzzkKe9pPm4n1U1wgYu7jX
// SIG // cWUwHQYDVR0OBBYEFBtmohn8m+ul2oSPGJjpEKTDe5K9
// SIG // MIIBBAYDVR0lBIH8MIH5BgcrBgEFAgMFBggrBgEFBQcD
// SIG // AQYIKwYBBQUHAwIGCisGAQQBgjcUAgEGCSsGAQQBgjcV
// SIG // BgYKKwYBBAGCNwoDDAYJKwYBBAGCNxUGBggrBgEFBQcD
// SIG // CQYIKwYBBQUIAgIGCisGAQQBgjdAAQEGCysGAQQBgjcK
// SIG // AwQBBgorBgEEAYI3CgMEBgkrBgEEAYI3FQUGCisGAQQB
// SIG // gjcUAgIGCisGAQQBgjcUAgMGCCsGAQUFBwMDBgorBgEE
// SIG // AYI3WwEBBgorBgEEAYI3WwIBBgorBgEEAYI3WwMBBgor
// SIG // BgEEAYI3WwUBBgorBgEEAYI3WwQBBgorBgEEAYI3WwQC
// SIG // MBkGCSsGAQQBgjcUAgQMHgoAUwB1AGIAQwBBMAsGA1Ud
// SIG // DwQEAwIBhjASBgNVHRMBAf8ECDAGAQH/AgEAMB8GA1Ud
// SIG // IwQYMBaAFCleUV5krjS566ycDaeMdQHRCQsoMIIBaAYD
// SIG // VR0fBIIBXzCCAVswggFXoIIBU6CCAU+GI2h0dHA6Ly9j
// SIG // cmwxLmFtZS5nYmwvY3JsL2FtZXJvb3QuY3JshjFodHRw
// SIG // Oi8vY3JsLm1pY3Jvc29mdC5jb20vcGtpaW5mcmEvY3Js
// SIG // L2FtZXJvb3QuY3JshiNodHRwOi8vY3JsMi5hbWUuZ2Js
// SIG // L2NybC9hbWVyb290LmNybIYjaHR0cDovL2NybDMuYW1l
// SIG // LmdibC9jcmwvYW1lcm9vdC5jcmyGgapsZGFwOi8vL0NO
// SIG // PWFtZXJvb3QsQ049QU1FUk9PVCxDTj1DRFAsQ049UHVi
// SIG // bGljJTIwS2V5JTIwU2VydmljZXMsQ049U2VydmljZXMs
// SIG // Q049Q29uZmlndXJhdGlvbixEQz1BTUUsREM9R0JMP2Nl
// SIG // cnRpZmljYXRlUmV2b2NhdGlvbkxpc3Q/YmFzZT9vYmpl
// SIG // Y3RDbGFzcz1jUkxEaXN0cmlidXRpb25Qb2ludDCCAasG
// SIG // CCsGAQUFBwEBBIIBnTCCAZkwNwYIKwYBBQUHMAKGK2h0
// SIG // dHA6Ly9jcmwxLmFtZS5nYmwvYWlhL0FNRVJPT1RfYW1l
// SIG // cm9vdC5jcnQwRwYIKwYBBQUHMAKGO2h0dHA6Ly9jcmwu
// SIG // bWljcm9zb2Z0LmNvbS9wa2lpbmZyYS9jZXJ0cy9BTUVS
// SIG // T09UX2FtZXJvb3QuY3J0MDcGCCsGAQUFBzAChitodHRw
// SIG // Oi8vY3JsMi5hbWUuZ2JsL2FpYS9BTUVST09UX2FtZXJv
// SIG // b3QuY3J0MDcGCCsGAQUFBzAChitodHRwOi8vY3JsMy5h
// SIG // bWUuZ2JsL2FpYS9BTUVST09UX2FtZXJvb3QuY3J0MIGi
// SIG // BggrBgEFBQcwAoaBlWxkYXA6Ly8vQ049YW1lcm9vdCxD
// SIG // Tj1BSUEsQ049UHVibGljJTIwS2V5JTIwU2VydmljZXMs
// SIG // Q049U2VydmljZXMsQ049Q29uZmlndXJhdGlvbixEQz1B
// SIG // TUUsREM9R0JMP2NBQ2VydGlmaWNhdGU/YmFzZT9vYmpl
// SIG // Y3RDbGFzcz1jZXJ0aWZpY2F0aW9uQXV0aG9yaXR5MA0G
// SIG // CSqGSIb3DQEBCwUAA4ICAQAot0qGmo8fpAFozcIA6pCL
// SIG // ygDhZB5ktbdA5c2ZabtQDTXwNARrXJOoRBu4Pk6VHVa7
// SIG // 8Xbz0OZc1N2xkzgZMoRpl6EiJVoygu8Qm27mHoJPJ9ao
// SIG // 9603I4mpHWwaqh3RfCfn8b/NxNhLGfkrc3wp2VwOtkAj
// SIG // J+rfJoQlgcacD14n9/VGt9smB6j9ECEgJy0443B+mwFd
// SIG // yCJO5OaUP+TQOqiC/MmA+r0Y6QjJf93GTsiQ/Nf+fjzi
// SIG // zTMdHggpTnxTcbWg9JCZnk4cC+AdoQBKR03kTbQfIm/n
// SIG // M3t275BjTx8j5UhyLqlqAt9cdhpNfdkn8xQz1dT6hTnL
// SIG // iowvNOPUkgbQtV+4crzKgHuHaKfJN7tufqHYbw3FnTZo
// SIG // pnTFr6f8mehco2xpU8bVKhO4i0yxdXmlC0hKGwGqdeoW
// SIG // NjdskyUyEih8xyOK47BEJb6mtn4+hi8TY/4wvuCzcvrk
// SIG // Zn0F0oXd9JbdO+ak66M9DbevNKV71YbEUnTZ81toX0Lt
// SIG // sbji4PMyhlTg/669BoHsoTg4yoC9hh8XLW2/V2lUg3+q
// SIG // HHQf/2g2I4mm5lnf1mJsu30NduyrmrDIeZ0ldqKzHAHn
// SIG // fAmyFSNzWLvrGoU9Q0ZvwRlDdoUqXbD0Hju98GL6dTew
// SIG // 3S2mcs+17DgsdargsEPm6I1lUE5iixnoEqFKWTX5j/TL
// SIG // UjGCFRowghUWAgEBMFgwQTETMBEGCgmSJomT8ixkARkW
// SIG // A0dCTDETMBEGCgmSJomT8ixkARkWA0FNRTEVMBMGA1UE
// SIG // AxMMQU1FIENTIENBIDAxAhM2AAABOXjGOfXldyfqAAEA
// SIG // AAE5MA0GCWCGSAFlAwQCAQUAoIGuMBkGCSqGSIb3DQEJ
// SIG // AzEMBgorBgEEAYI3AgEEMBwGCisGAQQBgjcCAQsxDjAM
// SIG // BgorBgEEAYI3AgEVMC8GCSqGSIb3DQEJBDEiBCCkbrAK
// SIG // CEkeyZGuyfZZVnZrrercaaPwQJvyhMYsPbRBVzBCBgor
// SIG // BgEEAYI3AgEMMTQwMqAUgBIATQBpAGMAcgBvAHMAbwBm
// SIG // AHShGoAYaHR0cDovL3d3dy5taWNyb3NvZnQuY29tMA0G
// SIG // CSqGSIb3DQEBAQUABIIBAAFXJ4TH4icLRZwV7cUID8Qr
// SIG // /T54JQZeW+yQkBJLHc5DCpLlsG6+ws/7SnV5KcdHxRfU
// SIG // lubpTYyCm2l1wWL89YIaBOj13L/PTgSGj+nY42OSDLD2
// SIG // Fo3LfLR+k4rQWN6Lb7Ro8AGXP24oRwdSUK/pBcgQ5aYl
// SIG // TZ52yalER8lk0xFpgC8m+Mf6ULLAOIaCRggGEXAGr5QN
// SIG // 1M/e1gGSBvudwC+i1NZknd7VUGUJOEPJP0u5xvNIrw5O
// SIG // MYZ8uPhg9LdRZtstz/c3Pb6IjaCTeCrCsA1gmCTbMkW9
// SIG // GkIqR4KbqHeUpMRxumBr2+15iw2EpPtWjpQo51idfG46
// SIG // +SsrmcNPakShghLiMIIS3gYKKwYBBAGCNwMDATGCEs4w
// SIG // ghLKBgkqhkiG9w0BBwKgghK7MIIStwIBAzEPMA0GCWCG
// SIG // SAFlAwQCAQUAMIIBUQYLKoZIhvcNAQkQAQSgggFABIIB
// SIG // PDCCATgCAQEGCisGAQQBhFkKAwEwMTANBglghkgBZQME
// SIG // AgEFAAQgT0wNOBP/y0T4vo7CDNZjMoh0EKELdKByb7fR
// SIG // f6wE+QkCBmA9D/CyehgTMjAyMTAzMDIxNzQyNTIuNzg2
// SIG // WjAEgAIB9KCB0KSBzTCByjELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjElMCMGA1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3Bl
// SIG // cmF0aW9uczEmMCQGA1UECxMdVGhhbGVzIFRTUyBFU046
// SIG // QUUyQy1FMzJCLTFBRkMxJTAjBgNVBAMTHE1pY3Jvc29m
// SIG // dCBUaW1lLVN0YW1wIFNlcnZpY2Wggg45MIIE8TCCA9mg
// SIG // AwIBAgITMwAAAUiiiEVWvC+AvwAAAAABSDANBgkqhkiG
// SIG // 9w0BAQsFADB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMK
// SIG // V2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwG
// SIG // A1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYD
// SIG // VQQDEx1NaWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAx
// SIG // MDAeFw0yMDExMTIxODI1NTZaFw0yMjAyMTExODI1NTZa
// SIG // MIHKMQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGlu
// SIG // Z3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMV
// SIG // TWljcm9zb2Z0IENvcnBvcmF0aW9uMSUwIwYDVQQLExxN
// SIG // aWNyb3NvZnQgQW1lcmljYSBPcGVyYXRpb25zMSYwJAYD
// SIG // VQQLEx1UaGFsZXMgVFNTIEVTTjpBRTJDLUUzMkItMUFG
// SIG // QzElMCMGA1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAg
// SIG // U2VydmljZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCC
// SIG // AQoCggEBAPf/eK8VhIrR0a1xdpnyk0sQBFutol7CvKL8
// SIG // mBtoqWruGEUhTUSRjQcyIVGbb9ay6S3raTbnO8PFbXp+
// SIG // mGDnzvr6XXBicKWB7+sWWtHZS7VbC0WZzXEanLj67Ghs
// SIG // IQx4gUMaEvkM1Nts6KwusFRhvJevt8/PFtWQTAkM/kUb
// SIG // afSujWo6N6AiQsiNdTqpqF25DFN+w84SnyOCowqf75+k
// SIG // fp+9cqV7BbN2x++GJngfgirUJM6f5+TGpwPBMdiRhliC
// SIG // qb7VfXHvjnyunr2qMV5U/cZsC8ltjdsWWrm7LGuI9xnE
// SIG // NmsHp/XAAtes7b8h19UR3BNaokgNkEmNPJxCGHFLeLUC
// SIG // AwEAAaOCARswggEXMB0GA1UdDgQWBBSHMvBpnw4EtEkf
// SIG // Sz0TrekhxYmiRzAfBgNVHSMEGDAWgBTVYzpcijGQ80N7
// SIG // fEYbxTNoWoVtVTBWBgNVHR8ETzBNMEugSaBHhkVodHRw
// SIG // Oi8vY3JsLm1pY3Jvc29mdC5jb20vcGtpL2NybC9wcm9k
// SIG // dWN0cy9NaWNUaW1TdGFQQ0FfMjAxMC0wNy0wMS5jcmww
// SIG // WgYIKwYBBQUHAQEETjBMMEoGCCsGAQUFBzAChj5odHRw
// SIG // Oi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpL2NlcnRzL01p
// SIG // Y1RpbVN0YVBDQV8yMDEwLTA3LTAxLmNydDAMBgNVHRMB
// SIG // Af8EAjAAMBMGA1UdJQQMMAoGCCsGAQUFBwMIMA0GCSqG
// SIG // SIb3DQEBCwUAA4IBAQBmEpbBsycL1DLByuWCzSpf1uHG
// SIG // Jka977wkQPbuE6LIZrxH2erMeDj6ro0p9hd9Lra4xQmn
// SIG // a74nu0g1RN//W6Av4rhHCw9V6ENqxIkmP7tugjFk/wBT
// SIG // /FB1VjuqCZAaZ3gX5zmGQkm2Xo1F5gT3TxDr3yqPWYOm
// SIG // vQzH7guE/+1OovoelkRRGWEU512fItK1UIV180jXIYc/
// SIG // 2fTI3Up+EYRXezswHOkUlfA5+XCDIT1zBDyOM5NWk1F0
// SIG // Kov8/lWIICjZ1yIeN3W7WLVDhBnrFvT4HUd1kVEQs6IX
// SIG // B/SyHdnXE55IVweDSssT6ux4fPhCG+gSPuH1sPxU3v8e
// SIG // cIPBakElMIIGcTCCBFmgAwIBAgIKYQmBKgAAAAAAAjAN
// SIG // BgkqhkiG9w0BAQsFADCBiDELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjEyMDAGA1UEAxMpTWljcm9zb2Z0IFJvb3QgQ2VydGlm
// SIG // aWNhdGUgQXV0aG9yaXR5IDIwMTAwHhcNMTAwNzAxMjEz
// SIG // NjU1WhcNMjUwNzAxMjE0NjU1WjB8MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1T
// SIG // dGFtcCBQQ0EgMjAxMDCCASIwDQYJKoZIhvcNAQEBBQAD
// SIG // ggEPADCCAQoCggEBAKkdDbx3EYo6IOz8E5f1+n9plGt0
// SIG // VBDVpQoAgoX77XxoSyxfxcPlYcJ2tz5mK1vwFVMnBDEf
// SIG // QRsalR3OCROOfGEwWbEwRA/xYIiEVEMM1024OAizQt2T
// SIG // rNZzMFcmgqNFDdDq9UeBzb8kYDJYYEbyWEeGMoQedGFn
// SIG // kV+BVLHPk0ySwcSmXdFhE24oxhr5hoC732H8RsEnHSRn
// SIG // EnIaIYqvS2SJUGKxXf13Hz3wV3WsvYpCTUBR0Q+cBj5n
// SIG // f/VmwAOWRH7v0Ev9buWayrGo8noqCjHw2k4GkbaICDXo
// SIG // eByw6ZnNPOcvRLqn9NxkvaQBwSAJk3jN/LzAyURdXhac
// SIG // AQVPIk0CAwEAAaOCAeYwggHiMBAGCSsGAQQBgjcVAQQD
// SIG // AgEAMB0GA1UdDgQWBBTVYzpcijGQ80N7fEYbxTNoWoVt
// SIG // VTAZBgkrBgEEAYI3FAIEDB4KAFMAdQBiAEMAQTALBgNV
// SIG // HQ8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAfBgNVHSME
// SIG // GDAWgBTV9lbLj+iiXGJo0T2UkFvXzpoYxDBWBgNVHR8E
// SIG // TzBNMEugSaBHhkVodHRwOi8vY3JsLm1pY3Jvc29mdC5j
// SIG // b20vcGtpL2NybC9wcm9kdWN0cy9NaWNSb29DZXJBdXRf
// SIG // MjAxMC0wNi0yMy5jcmwwWgYIKwYBBQUHAQEETjBMMEoG
// SIG // CCsGAQUFBzAChj5odHRwOi8vd3d3Lm1pY3Jvc29mdC5j
// SIG // b20vcGtpL2NlcnRzL01pY1Jvb0NlckF1dF8yMDEwLTA2
// SIG // LTIzLmNydDCBoAYDVR0gAQH/BIGVMIGSMIGPBgkrBgEE
// SIG // AYI3LgMwgYEwPQYIKwYBBQUHAgEWMWh0dHA6Ly93d3cu
// SIG // bWljcm9zb2Z0LmNvbS9QS0kvZG9jcy9DUFMvZGVmYXVs
// SIG // dC5odG0wQAYIKwYBBQUHAgIwNB4yIB0ATABlAGcAYQBs
// SIG // AF8AUABvAGwAaQBjAHkAXwBTAHQAYQB0AGUAbQBlAG4A
// SIG // dAAuIB0wDQYJKoZIhvcNAQELBQADggIBAAfmiFEN4sbg
// SIG // mD+BcQM9naOhIW+z66bM9TG+zwXiqf76V20ZMLPCxWbJ
// SIG // at/15/B4vceoniXj+bzta1RXCCtRgkQS+7lTjMz0YBKK
// SIG // dsxAQEGb3FwX/1z5Xhc1mCRWS3TvQhDIr79/xn/yN31a
// SIG // PxzymXlKkVIArzgPF/UveYFl2am1a+THzvbKegBvSzBE
// SIG // JCI8z+0DpZaPWSm8tv0E4XCfMkon/VWvL/625Y4zu2Jf
// SIG // mttXQOnxzplmkIz/amJ/3cVKC5Em4jnsGUpxY517IW3D
// SIG // nKOiPPp/fZZqkHimbdLhnPkd/DjYlPTGpQqWhqS9nhqu
// SIG // BEKDuLWAmyI4ILUl5WTs9/S/fmNZJQ96LjlXdqJxqgaK
// SIG // D4kWumGnEcua2A5HmoDF0M2n0O99g/DhO3EJ3110mCII
// SIG // YdqwUB5vvfHhAN/nMQekkzr3ZUd46PioSKv33nJ+YWtv
// SIG // d6mBy6cJrDm77MbL2IK0cs0d9LiFAR6A+xuJKlQ5slva
// SIG // yA1VmXqHczsI5pgt6o3gMy4SKfXAL1QnIffIrE7aKLix
// SIG // qduWsqdCosnPGUFN4Ib5KpqjEWYw07t0MkvfY3v1mYov
// SIG // G8chr1m1rtxEPJdQcdeh0sVV42neV8HR3jDA/czmTfsN
// SIG // v11P6Z0eGTgvvM9YBS7vDaBQNdrvCScc1bN+NR4Iuto2
// SIG // 29Nfj950iEkSoYICyzCCAjQCAQEwgfihgdCkgc0wgcox
// SIG // CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9u
// SIG // MRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
// SIG // b3NvZnQgQ29ycG9yYXRpb24xJTAjBgNVBAsTHE1pY3Jv
// SIG // c29mdCBBbWVyaWNhIE9wZXJhdGlvbnMxJjAkBgNVBAsT
// SIG // HVRoYWxlcyBUU1MgRVNOOkFFMkMtRTMyQi0xQUZDMSUw
// SIG // IwYDVQQDExxNaWNyb3NvZnQgVGltZS1TdGFtcCBTZXJ2
// SIG // aWNloiMKAQEwBwYFKw4DAhoDFQCHK4KWuhxZ/hIhxFp8
// SIG // ARfVGGzrOaCBgzCBgKR+MHwxCzAJBgNVBAYTAlVTMRMw
// SIG // EQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRt
// SIG // b25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRp
// SIG // b24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1w
// SIG // IFBDQSAyMDEwMA0GCSqGSIb3DQEBBQUAAgUA4+jf4DAi
// SIG // GA8yMDIxMDMwMzAwMDEzNloYDzIwMjEwMzA0MDAwMTM2
// SIG // WjB0MDoGCisGAQQBhFkKBAExLDAqMAoCBQDj6N/gAgEA
// SIG // MAcCAQACAhDNMAcCAQACAhDFMAoCBQDj6jFgAgEAMDYG
// SIG // CisGAQQBhFkKBAIxKDAmMAwGCisGAQQBhFkKAwKgCjAI
// SIG // AgEAAgMHoSChCjAIAgEAAgMBhqAwDQYJKoZIhvcNAQEF
// SIG // BQADgYEAAdmayTK7LbBhyTb2UsxJZ20NHLTF1c7wdAWG
// SIG // jFEZpONOgLgUYkFQiLrEcXXcB0Kna8U0O4bLcmuIzC1m
// SIG // 55mLrzkdtg+fYjkk56/pHUXq7gh2bp2oKRKTTnm9P0sN
// SIG // O8rTRm7ZEoNVyq4ygwCq6+YipB9vco9s9LVhwY07hJDa
// SIG // ac8xggMNMIIDCQIBATCBkzB8MQswCQYDVQQGEwJVUzET
// SIG // MBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVk
// SIG // bW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0
// SIG // aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1TdGFt
// SIG // cCBQQ0EgMjAxMAITMwAAAUiiiEVWvC+AvwAAAAABSDAN
// SIG // BglghkgBZQMEAgEFAKCCAUowGgYJKoZIhvcNAQkDMQ0G
// SIG // CyqGSIb3DQEJEAEEMC8GCSqGSIb3DQEJBDEiBCDXv2BM
// SIG // /e5PcnnYlNigIVlqWpu1aDYEGIo5FPxIgOyuIDCB+gYL
// SIG // KoZIhvcNAQkQAi8xgeowgecwgeQwgb0EIKmQGuqMeaG/
// SIG // Jh/m1NxO8Pljhr5Xv1PBVXpPVoDB22jYMIGYMIGApH4w
// SIG // fDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0
// SIG // b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1p
// SIG // Y3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWlj
// SIG // cm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIwMTACEzMAAAFI
// SIG // oohFVrwvgL8AAAAAAUgwIgQgWdHV76n4J5J8XAaJ3NJp
// SIG // Q9Gs15CqnOEhy1J7PMARUtUwDQYJKoZIhvcNAQELBQAE
// SIG // ggEAevUJGNJ0EsYLEAzOsEqEBEB0g/ZMo0Ffklfx54Uq
// SIG // sL1ed2B7nvKahuH/n0zflSeZ6K7MIM1YV5pl9+yLZJam
// SIG // TzzYoPH6OUUxY8in7XzqcAP2HbVMC4dqnY1pVXGtSvVf
// SIG // 3iXapvHgKA/t94x1d88yzcBa4XDDINIoCuvueP1q0peJ
// SIG // 8Nf/lpJ9x0Nga4nvj8raWydp9OZnigIxYUFzKK5fc1fz
// SIG // f6GYyZIBvm/9V1Bib9DFqjn46tN6l4aIAVmEPRNez2Xx
// SIG // IY1dxxxWltRt+IY8L43C+64+jcxRI52VObFmzQHSjFDr
// SIG // ogBExSUpWcia2pzRuIxrxS0EPcfwvy3H4CIgyw==
// SIG // End signature block
