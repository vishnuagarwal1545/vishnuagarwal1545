export function buildPath(cols, rows) {
  const path = [];
  for (let col = 0; col < cols; col++) {
    const topToBottom = col % 2 === 0;
    for (let i = 0; i < rows; i++) {
      const row = topToBottom ? i : rows - 1 - i;
      path.push(row * cols + col);
    }
  }
  return path;
}
