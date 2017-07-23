import * as chalk from 'chalk';

import {
  BACKEND_LEGACY,
  BACKEND_PRO,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
  validators,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'login',
  type: 'global',
  backends: [BACKEND_LEGACY, BACKEND_PRO],
  description: 'Login with your Ionic ID',
  longDescription: `
Authenticate with Ionic servers and retrieve a user token, which is stored in the CLI config.

Alternatively, set the ${chalk.green('IONIC_EMAIL')} and ${chalk.green('IONIC_PASSWORD')} environment variables, and the CLI will automatically authenticate you.

If you need to create an Ionic account, use ${chalk.green('ionic signup')}.
  `,
  exampleCommands: ['', 'john@example.com', 'hello@example.com secret'],
  inputs: [
    {
      name: 'email',
      description: 'Your email address',
      validators: [validators.email],
      private: true,
    },
    {
      name: 'password',
      description: 'Your password',
      private: true,
    }
  ],
  options: [
    {
      name: 'email',
      description: '',
      private: true,
      visible: false,
    },
    {
      name: 'password',
      description: '',
      private: true,
      visible: false,
    },
  ],
})
export class LoginCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const [ email, ] = inputs;

    const config = await this.env.config.load();

    if (await this.env.session.isLoggedIn()) {
      const extra = !inputs[0] || !inputs[1] ? 'Prompting for new credentials.' : 'Attempting login.';
      this.env.log.warn(`You are already logged in${config.user.email ? ' as ' + chalk.bold(config.user.email) : ''}! ${this.env.flags.interactive ? extra : ''}`);
    } else {
      this.env.log.msg(`Log into your Ionic account\n` +
                       `If you don't have one yet, create yours by running: ${chalk.green(`ionic signup`)}\n`);
    }

    if (options['email'] || options['password']) {
      const extra = this.env.flags.interactive ? 'You will be prompted to provide credentials. Alternatively, you can try this:' : 'Try this:';
      this.env.log.warn(
        `${chalk.green('email')} and ${chalk.green('password')} are command arguments, not options. ${extra}\n\n` +
        `${chalk.green('ionic login ' + (options['email'] ? options['email'] : email) + ' *****')}\n`
      );
    }

    // TODO: combine with promptToLogin ?

    if (!inputs[0]) {
      const email = await this.env.prompt({
        type: 'input',
        name: 'email',
        message: 'Email:',
        default: options['email'],
        validate: v => validators.email(v),
      });

      inputs[0] = email;
    }

    if (!inputs[1]) {
      const password = await this.env.prompt({
        type: 'password',
        name: 'password',
        message: 'Password:',
      });

      inputs[1] = password;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ email, password ] = inputs;

    await this.env.session.login(email, password);
    this.env.log.ok('You are logged in!');

    const config = await this.env.config.load();

    if (config.backend === BACKEND_PRO) {
      if (!config.git.setup) {
        this.env.log.nl();
        this.env.log.warn(
          `Looks like you haven't configured your SSH settings yet.\n` +
          `(You can run ${chalk.green('ionic config set -g git.setup true')} to disable this prompt.)\n`
        );

        await this.runcmd(['ssh', 'setup']);
      }
    }
  }
}
