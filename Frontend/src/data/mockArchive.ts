export type FeedItem = {
  id: string;
  designerName: string;
  verified: boolean;
  followed: boolean;
  image: string;
  avatar: string;
  designName: string;
  likes: number;
  downloads: number;
  trending: boolean;
  liked: boolean;
};

export const MOCK_FEED: FeedItem[] = [
  {
    id: '1',
    designerName: 'Marcus Chen',
    verified: true,
    followed: false,
    image:
      'https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=600',
    avatar:
      'https://images.pexels.com/photos/220459/pexels-photo-220459.jpeg?auto=compress&cs=tinysrgb&w=100',
    designName: 'Planetary Gear Set V3',
    likes: 1240,
    downloads: 320,
    trending: true,
    liked: false,
  },
  {
    id: '2',
    designerName: 'Priya Patel',
    verified: true,
    followed: true,
    image:
      'https://images.pexels.com/photos/3825586/pexels-photo-3825586.jpeg?auto=compress&cs=tinysrgb&w=600',
    avatar:
      'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
    designName: 'Drone GoPro Mount',
    likes: 890,
    downloads: 210,
    trending: true,
    liked: true,
  },
  {
    id: '3',
    designerName: 'Jonas Weiss',
    verified: false,
    followed: false,
    image:
      'https://images.pexels.com/photos/4488649/pexels-photo-4488649.jpeg?auto=compress&cs=tinysrgb&w=600',
    avatar:
      'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=100',
    designName: 'Raspberry Pi Enclosure',
    likes: 567,
    downloads: 145,
    trending: false,
    liked: false,
  },
];

export type Designer = {
  id: string;
  name: string;
  verified: boolean;
  designs: string;
  followers: string;
  following: boolean;
  avatar: string;
};

export const MOCK_FOLLOWING: Designer[] = [
  {
    id: '1',
    name: 'Marcus Chen',
    verified: true,
    designs: '24 designs',
    followers: '1.2k followers',
    following: true,
    avatar:
      'https://images.pexels.com/photos/220459/pexels-photo-220459.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    id: '2',
    name: 'Priya Patel',
    verified: true,
    designs: '18 designs',
    followers: '890 followers',
    following: true,
    avatar:
      'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    id: '3',
    name: 'GearWorks Lab',
    verified: true,
    designs: '56 designs',
    followers: '3.4k followers',
    following: true,
    avatar:
      'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    id: '4',
    name: 'Jonas Weiss',
    verified: false,
    designs: '8 designs',
    followers: '234 followers',
    following: true,
    avatar:
      'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
];

export const MOCK_DESIGN_IMAGES = [
  'https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/3825586/pexels-photo-3825586.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/4488649/pexels-photo-4488649.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/4488626/pexels-photo-4488626.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/4488637/pexels-photo-4488637.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/3825582/pexels-photo-3825582.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/2582933/pexels-photo-2582933.jpeg?auto=compress&cs=tinysrgb&w=300',
  'https://images.pexels.com/photos/4488630/pexels-photo-4488630.jpeg?auto=compress&cs=tinysrgb&w=300',
];
