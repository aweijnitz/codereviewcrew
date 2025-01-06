import { listFiles } from '../src/tools/listFiles';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('listFiles', () => {
  const mockFiles: { [key: string]: string[] } = {
    'root': ['file1.txt', 'subfolder'],
    'root/subfolder': ['file2.txt', 'file3.txt', 'subsubfolder'],
    'root/subfolder/subsubfolder': ['file4.txt']
  };

  beforeEach(() => {
    (fs.readdirSync as jest.Mock).mockImplementation((folder: string) => {
      const relativePath = path.relative(process.cwd(), folder);
      return mockFiles[relativePath] || [];
    });

    (fs.statSync as jest.Mock).mockImplementation((filePath: string) => {
      const relativePath = path.relative(process.cwd(), filePath);
      return {
        isDirectory: () => !relativePath.endsWith('txt') // all files in our mock ends with txt
      };
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should list all files with their relative paths', () => {
    const result = listFiles('root');
    expect(result).toEqual([
      'file1.txt',
      'subfolder/file2.txt',
      'subfolder/file3.txt',
      'subfolder/subsubfolder/file4.txt'
    ]);
  });

  test('should return an empty array if the folder is empty', () => {
    (fs.readdirSync as jest.Mock).mockReturnValueOnce([]);
    const result = listFiles('emptyFolder');
    expect(result).toEqual([]);
  });
});