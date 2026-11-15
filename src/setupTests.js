// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// react-router 7이 쓰는 TextEncoder가 CRA의 jsdom에는 없어서 채워 넣음
import { TextDecoder, TextEncoder } from "util";
Object.assign(global, { TextEncoder, TextDecoder });
