export type SiteConfig = {
  browserTitle: string;
  favicon: string;
  heroTitle: string;
  heroDescription: string;
  heroImage?: string;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    cardColor: string;
    textColor: string;
  };
  tabs: TabData[];
};

export type TabData = {
  id: string;
  type: 'video' | 'about';
  name: string;
  iconName: string;
  cards: CardData[];
  aboutText?: string;
  aboutImage?: string;
};

export type CardData = {
  id: string;
  title: string;
  videoUrl1: string;
  videoUrl2: string;
  description: string;
  tags: string[];
};
