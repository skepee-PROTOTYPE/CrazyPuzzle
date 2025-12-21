/// <reference types="jest" />
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main menu', () => {
  render(<App />);
  const titleElement = screen.getByText('🧩 CrazyPuzzle');
  expect(titleElement).toBeInTheDocument();
  expect(screen.getByText('Single Player')).toBeInTheDocument();
  expect(screen.getByText('Multiplayer')).toBeInTheDocument();
});
