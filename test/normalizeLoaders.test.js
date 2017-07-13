/* eslint-disable babel/no-invalid-this, func-names */
const expect = require('expect');

const normalizeLoader = require('../src/normalizeLoader');

describe('normalizeLoader', () => {
  it('should convert `babel` to `babel-loader`', () => {
    expect(normalizeLoader('babel')).toBe('babel-loader');
  });

  it('should convert `react-hot-loader/webpack` to `react-hot-loader`', () => {
    expect(normalizeLoader('react-hot-loader/webpack')).toBe('react-hot-loader');
  });
});
