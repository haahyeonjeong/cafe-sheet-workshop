// 이 파일을 수정하고 GitHub에 푸시하면 메뉴를 바꾸는 실습을 할 수 있습니다.
// 아래 메뉴·가격은 실습용 예시이며 매장의 최신 판매 정보가 아닙니다.
export const cafe = {
  name: '읍천리382 오산1호점',
  address: '경기 오산시 경기대로 209 1층 104호',
  naverMapUrl: 'https://map.naver.com/p/search/' + encodeURIComponent('읍천리382 오산1호점'),
  categories: ['전체', '커피', '논커피', '디저트'],
};

export const menu = [
  { id: 'americano', name: '아메리카노', image: '/images/americano.jpg', imageAlt: '읍천리382 아메리카노 실제 메뉴 사진', category: '커피', price: 3500, description: '깔끔하고 깊은 커피 한 잔', temperatures: ['ICE', 'HOT'] },
  { id: 'caffe-latte', name: '카페라떼', image: '/images/caffe-latte.jpg', imageAlt: '읍천리382 카페라떼 실제 메뉴 사진', category: '커피', price: 4000, description: '에스프레소와 부드러운 우유', temperatures: ['ICE', 'HOT'] },
  { id: 'vanilla-latte', name: '바닐라라떼', image: '/images/vanilla-latte.jpg', imageAlt: '읍천리382 바닐라빈라떼 실제 메뉴 사진', category: '커피', price: 4500, description: '달콤한 바닐라 향을 더한 라떼', temperatures: ['ICE', 'HOT'] },
  { id: 'grain-latte', name: '미숫가루', image: '/images/grain-latte.jpg', imageAlt: '읍천리382 미숫가루 실제 메뉴 사진', category: '논커피', price: 4500, description: '고소한 곡물의 든든한 맛', temperatures: ['ICE'] },
  { id: 'strawberry-latte', name: '딸기라떼', image: '/images/strawberry-latte.jpg', imageAlt: '읍천리382 딸기밭라떼 실제 메뉴 사진', category: '논커피', price: 5500, description: '딸기와 우유의 달콤한 조합', temperatures: ['ICE'] },
  { id: 'chocolate-latte', name: '초코라떼', image: '/images/chocolate-latte.jpg', imageAlt: '읍천리382 초코라떼 실제 메뉴 사진', category: '논커피', price: 4500, description: '진한 초콜릿을 부드럽게', temperatures: ['ICE', 'HOT'] },
  { id: 'lemon-ade', name: '레몬에이드', image: '/images/lemon-ade.jpg', imageAlt: '읍천리382 레몬에이드 실제 메뉴 사진', category: '논커피', price: 5000, description: '레몬의 상큼함을 시원하게', temperatures: ['ICE'] },
  { id: 'cookie', name: '임자떡 쿠키', image: '/images/cookie.jpg', imageAlt: '읍천리382 임자떡 쿠키 실제 메뉴 사진', category: '디저트', price: 2500, description: '고소한 흑임자와 쫄깃한 찰떡', temperatures: ['기본'] },
];
