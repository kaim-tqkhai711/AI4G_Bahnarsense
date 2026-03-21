export type AlphabetCategory = 'basic' | 'extended' | 'diphthong' | 'cluster';

export interface AlphabetGroup {
  id: AlphabetCategory;
  title: string;
  description: string;
  items: string[];
}

export const bahnarAlphabet: AlphabetGroup[] = [
  {
    id: 'basic',
    title: '24 chữ cái gốc',
    description: 'Các phụ âm và nguyên âm cơ bản nhất trong tiếng Ba Na.',
    items: [
      'a', 'b', 'ƀ', 'č', 'd', 'đ', 'e', 'g', 'h', 'i', 
      'j', 'k', 'l', 'm', 'n', 'ñ', 'o', 'p', 'r', 's', 
      't', 'u', 'w', 'y'
    ]
  },
  {
    id: 'extended',
    title: '5 nguyên âm mở rộng',
    description: 'Các chữ cái bổ sung biểu thị nguyên âm mở rộng.',
    items: [
      'â', 'ê', 'ô', 'ơ', 'ư'
    ]
  },
  {
    id: 'diphthong',
    title: '12 nguyên âm đôi',
    description: 'Sự kết hợp của 2 nguyên âm đứng liền nhau tạo ra âm kép.',
    items: [
      'ia', 'iă', 'ie', 'iĕ', 'io', 'iô', 
      'ua', 'uă', 'ue', 'uĕ', 'uê', 'uê̆'
    ]
  },
  {
    id: 'cluster',
    title: 'Tổ hợp phụ âm (47 âm)',
    description: 'Các cụm phụ âm ghép rất phổ biến (lên tới 47 tổ hợp).',
    items: [
      'bl', 'br', 'by', 'ch', 'čr',
      'dj', 'djr', 'dr', 'gr', 'gry',
      'gy', 'hl', 'hm', 'hml', 'hmr',
      'hmy', 'hn', 'hng', 'hñ', 'hr',
      'hy', 'jr', 'kh', 'khy', 'kl',
      'kr', 'ky', 'ly', 'ml', 'mr',
      'ny', 'my', 'ñr', 'ng', 'ngl',
      'ngr', "'ngr", 'nhr', 'ngy',
      'ph', 'phr', 'phy', 'pl', 'pr',
      'py', 'sr', 'th', 'thy', 'tr', 'ty'
    ]
  }
];
