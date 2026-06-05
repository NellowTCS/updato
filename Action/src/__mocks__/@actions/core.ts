import { jest } from "@jest/globals";

export const getInput = jest.fn<() => string>();
export const setFailed = jest.fn<() => void>();
export const setOutput = jest.fn<() => void>();
export const info = jest.fn<() => void>();
export const startGroup = jest.fn<() => void>();
export const endGroup = jest.fn<() => void>();
