import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export function canPrompt(flags: { headless: boolean; json: boolean }): boolean {
  return !flags.headless && !flags.json && Boolean(input.isTTY && output.isTTY);
}

export async function askText(question: string, defaultValue: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    const hint = defaultValue ? ` [${defaultValue}]` : "";
    const answer = (await rl.question(`${question}${hint}: `)).trim();
    return answer || defaultValue;
  } finally {
    rl.close();
  }
}

export async function askChoice<T extends string>(
  question: string,
  choices: readonly T[],
  defaultValue: T,
): Promise<T> {
  const list = choices.map((c, i) => `  ${i + 1}) ${c}${c === defaultValue ? " (default)" : ""}`).join("\n");
  const rl = createInterface({ input, output });
  try {
    for (;;) {
      const answer = (
        await rl.question(`${question}\n${list}\n> `)
      ).trim();
      if (!answer) return defaultValue;
      const asNum = Number(answer);
      if (Number.isInteger(asNum) && asNum >= 1 && asNum <= choices.length) {
        return choices[asNum - 1]!;
      }
      const asName = choices.find((c) => c === answer || c.startsWith(answer));
      if (asName) return asName;
      console.log(`Pick one of: ${choices.join(", ")}`);
    }
  } finally {
    rl.close();
  }
}

export async function askYesNo(question: string, defaultYes: boolean): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(`${question} [${hint}]: `)).trim().toLowerCase();
    if (!answer) return defaultYes;
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

export async function askMulti(
  question: string,
  choices: readonly string[],
  defaults: readonly string[],
): Promise<string[]> {
  const shown = choices
    .map((c) => `  ${defaults.includes(c) ? "[x]" : "[ ]"} ${c}`)
    .join("\n");
  const rl = createInterface({ input, output });
  try {
    const answer = (
      await rl.question(
        `${question}\n${shown}\nComma-separated list (Enter keeps defaults): `,
      )
    ).trim();
    if (!answer) return [...defaults];
    const picked = answer.split(/[\s,]+/).filter(Boolean);
    const unknown = picked.filter((p) => !choices.includes(p));
    if (unknown.length) {
      throw new Error(`Unknown modules: ${unknown.join(", ")}. Known: ${choices.join(", ")}`);
    }
    return picked;
  } finally {
    rl.close();
  }
}
