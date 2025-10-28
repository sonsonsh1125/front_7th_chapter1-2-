# 테스트 코드 작성 규칙

> 실전에서 바로 적용 가능한 테스트 작성 베스트 프랙티스

## 📚 목차

1. [테스트 작성 4대 원칙](#1-테스트-작성-4대-원칙)
2. [테스트 네이밍 규칙](#2-테스트-네이밍-규칙)
3. [테스트 작성 기본 패턴](#3-테스트-작성-기본-패턴)
4. [경계값과 엣지 케이스](#4-경계값과-엣지-케이스)
5. [시간 테스트 전략](#5-시간-테스트-전략)
6. [API Mock 전략 (MSW)](#6-api-mock-전략-msw)
7. [React Hook 테스트](#7-react-hook-테스트)
8. [컴포넌트 통합 테스트](#8-컴포넌트-통합-테스트)
9. [테스트 헬퍼 패턴](#9-테스트-헬퍼-패턴)
10. [테스트 구조화 전략](#10-테스트-구조화-전략)
11. [안티패턴 & 주의사항](#11-안티패턴--주의사항)
12. [테스트 체크리스트](#12-테스트-체크리스트)

---

## 1. 테스트 코드 작성 기본 원칙

### 원칙 1: 인터페이스를 기준으로 테스트

**내부 구현이 아닌 외부에 노출되는 Public API를 테스트합니다.**

```typescript
// ❌ 나쁜 예: 내부 구현을 테스트
it('useState를 사용한다', () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current.state).toBeDefined(); // 내부 구조 의존
  expect(result.current._privateMethod).toBeDefined(); // private 메서드 테스트
});

// ✅ 좋은 예: Public API(동작)를 테스트
it('카운터가 증가한다', () => {
  const { result } = renderHook(() => useCounter());

  act(() => {
    result.current.increment(); // public 메서드
  });

  expect(result.current.count).toBe(1); // public 상태
});
```

**컴포넌트는 사용자 관점에서 테스트합니다.**

```typescript
// ❌ 나쁜 예: 구현 세부사항 테스트
it('handleClick 함수가 호출된다', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick} />);
  // 내부 함수 호출 여부를 테스트
});

// ✅ 좋은 예: 사용자가 보는 결과 테스트
it('버튼을 클릭하면 카운트가 1 증가한다', async () => {
  const { user } = setup(<Counter />);

  await user.click(screen.getByRole('button', { name: '증가' }));

  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

**실전 예제: 검색 기능**

```typescript
// ❌ 나쁜 예: 내부 필터 로직 테스트
it('filterEvents 함수가 호출된다', () => {
  const filterEvents = vi.fn();
  render(<EventList filterEvents={filterEvents} />);
  // 함수가 몇 번 호출되는지 테스트
});

// ✅ 좋은 예: 사용자가 경험하는 결과 테스트
it("'팀 회의'를 검색하면 해당 제목을 가진 일정이 리스트에 노출된다", async () => {
  const { user } = setup(<App />);

  const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
  await user.type(searchInput, '팀 회의');

  const eventList = within(screen.getByTestId('event-list'));
  expect(eventList.getByText('팀 회의')).toBeInTheDocument();
  expect(eventList.queryByText('프로젝트 계획')).not.toBeInTheDocument();
});
```

**핵심 포인트:**

- 내부 상태 변수, private 메서드는 테스트하지 않음
- 사용자가 보고 상호작용하는 것만 테스트
- 구현이 바뀌어도 테스트는 깨지지 않아야 함

---

### 원칙 2: 커버리지보다 의미있는 테스트인지 고민

**간단한 유틸 함수는 과감하게 테스트를 생략합니다.**

```typescript
// ❌ 불필요한 테스트: 너무 간단한 함수
export function fillZero(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

// 이런 함수는 테스트 작성 시간이 아깝습니다.
// 대신 이 함수를 사용하는 곳에서 통합 테스트하세요.

// ✅ 의미있는 테스트: 실제 사용 맥락에서 검증
describe('formatDate', () => {
  it('날짜를 YYYY-MM-DD 형식으로 포맷팅한다', () => {
    // fillZero는 여기서 자연스럽게 검증됨
    const result = formatDate(new Date('2023-05-03'));
    expect(result).toBe('2023-05-03'); // fillZero가 '03'을 만들어야 통과
  });
});
```

**테스트를 생략해도 되는 경우:**

1. **단순 Getter/Setter**

```typescript
// ❌ 테스트 불필요
class User {
  private name: string;

  getName() {
    return this.name;
  }
  setName(name: string) {
    this.name = name;
  }
}
```

2. **단순 상수/설정**

```typescript
// ❌ 테스트 불필요
export const API_URL = 'https://api.example.com';
export const TIMEOUT = 5000;
```

3. **너무 간단한 유틸리티**

```typescript
// ❌ 테스트 불필요
export const add = (a, b) => a + b;
export const isEmpty = (str) => str.length === 0;
```

**테스트가 필요한 경우:**

1. **비즈니스 로직이 있는 경우**

```typescript
// ✅ 테스트 필요
export function getTimeErrorMessage(startTime: string, endTime: string) {
  if (!startTime || !endTime) {
    return { startTimeError: null, endTimeError: null };
  }

  if (startTime >= endTime) {
    return {
      startTimeError: '시작 시간은 종료 시간보다 빨라야 합니다.',
      endTimeError: '종료 시간은 시작 시간보다 늦어야 합니다.',
    };
  }

  return { startTimeError: null, endTimeError: null };
}
```

2. **엣지 케이스가 있는 경우**

```typescript
// ✅ 테스트 필요
export function getDaysInMonth(year: number, month: number): number {
  // 윤년 처리, 월 경계 등 엣지 케이스 존재
  return new Date(year, month, 0).getDate();
}
```

3. **중요한 기능인 경우**

```typescript
// ✅ 테스트 필요
export function findOverlappingEvents(newEvent: Event, existingEvents: Event[]): Event[] {
  // 일정 충돌 검사는 핵심 기능
  // ...
}
```

**핵심 포인트:**

- 100% 커버리지가 목표가 아님
- 변경 가능성이 거의 없는 간단한 코드는 생략
- 실제 사용 맥락에서 통합 테스트하는 것이 더 효율적

---

### 원칙 3: 높은 가독성

**테스트는 살아있는 문서입니다.**

```typescript
// ❌ 나쁜 예: 무엇을 테스트하는지 불명확
it('test1', () => {
  const result = func('14:00', '13:00');
  expect(result.err).toBe('error message');
});

// ✅ 좋은 예: 테스트만 봐도 기능을 이해할 수 있음
describe('getTimeErrorMessage', () => {
  it('시작 시간이 종료 시간보다 늦을 때 에러 메시지를 반환한다', () => {
    const result = getTimeErrorMessage('14:00', '13:00');

    expect(result.startTimeError).toBe('시작 시간은 종료 시간보다 빨라야 합니다.');
    expect(result.endTimeError).toBe('종료 시간은 시작 시간보다 늦어야 합니다.');
  });

  it('시작 시간이 종료 시간보다 빠를 때 null을 반환한다', () => {
    const result = getTimeErrorMessage('13:00', '14:00');

    expect(result.startTimeError).toBeNull();
    expect(result.endTimeError).toBeNull();
  });
});
```

**의미있는 변수명 사용**

```typescript
// ❌ 나쁜 예
it('test', () => {
  const e1 = { id: 1, t: 'a', d: '2025-10-01', st: '09:00', et: '10:00' };
  const e2 = { id: 2, t: 'b', d: '2025-10-01', st: '09:30', et: '10:30' };
  const r = check(e1, e2);
  expect(r).toBe(true);
});

// ✅ 좋은 예
it('겹치는 시간에 새 일정을 추가할 때 경고가 표시된다', () => {
  const existingEvent = {
    id: '1',
    title: '기존 회의',
    date: '2025-10-15',
    startTime: '09:00',
    endTime: '10:00',
  };

  const newEvent = {
    id: '2',
    title: '새 회의',
    date: '2025-10-15',
    startTime: '09:30', // 기존 회의와 겹침
    endTime: '10:30',
  };

  const hasOverlap = isOverlapping(existingEvent, newEvent);

  expect(hasOverlap).toBe(true);
});
```

**매직 넘버/문자열 제거**

```typescript
// ❌ 나쁜 예
it('test', () => {
  vi.advanceTimersByTime(300000);
  expect(result).toHaveLength(3);
});

// ✅ 좋은 예
it('알림 시간 5분 전이 되면 알림이 생성된다', () => {
  const 분 = 1000 * 60;
  const NOTIFICATION_TIME = 5;
  const EXPECTED_NOTIFICATION_COUNT = 1;

  vi.advanceTimersByTime(NOTIFICATION_TIME * 분);

  expect(result.notifications).toHaveLength(EXPECTED_NOTIFICATION_COUNT);
});
```

**주석보다는 명확한 코드**

```typescript
// ❌ 나쁜 예
it('test', () => {
  // 사용자 생성
  const user = create();
  // 이름 변경
  update(user, 'new');
  // 확인
  expect(user.name).toBe('new');
});

// ✅ 좋은 예: 코드 자체가 설명
it('사용자 이름을 수정하면 변경된 이름으로 업데이트된다', () => {
  const user = createUser({ name: 'original' });

  updateUserName(user, 'updated');

  expect(user.name).toBe('updated');
});
```

**핵심 포인트:**

- 테스트 이름은 한글로 구체적으로
- 변수명은 의미를 명확히 전달
- 매직 넘버는 상수로 추출
- 주석 없이도 이해 가능한 코드

---

### 원칙 4: 하나의 테스트에서는 하나의 동작만 검증

**테스트는 작고 명확하게 나눕니다.**

```typescript
// ❌ 나쁜 예: 여러 동작을 한 번에 테스트
it('사용자 CRUD가 모두 동작한다', async () => {
  const { user } = setup(<App />);

  // 생성
  await user.click(screen.getByText('일정 추가'));
  await user.type(screen.getByLabelText('제목'), '새 회의');
  await user.click(screen.getByTestId('event-submit-button'));
  expect(screen.getByText('새 회의')).toBeInTheDocument();

  // 수정
  await user.click(screen.getByLabelText('Edit event'));
  await user.clear(screen.getByLabelText('제목'));
  await user.type(screen.getByLabelText('제목'), '수정된 회의');
  await user.click(screen.getByTestId('event-submit-button'));
  expect(screen.getByText('수정된 회의')).toBeInTheDocument();

  // 삭제
  await user.click(screen.getByLabelText('Delete event'));
  expect(screen.queryByText('수정된 회의')).not.toBeInTheDocument();
});

// ✅ 좋은 예: 각 동작을 개별 테스트로 분리
describe('일정 CRUD', () => {
  it('새로운 일정을 생성한다', async () => {
    const { user } = setup(<App />);

    await user.click(screen.getByText('일정 추가'));
    await user.type(screen.getByLabelText('제목'), '새 회의');
    await user.click(screen.getByTestId('event-submit-button'));

    expect(screen.getByText('새 회의')).toBeInTheDocument();
  });

  it('기존 일정을 수정한다', async () => {
    setupMockHandlerUpdating();
    const { user } = setup(<App />);

    await user.click(screen.getByLabelText('Edit event'));
    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '수정된 회의');
    await user.click(screen.getByTestId('event-submit-button'));

    expect(screen.getByText('수정된 회의')).toBeInTheDocument();
  });

  it('일정을 삭제한다', async () => {
    setupMockHandlerDeletion();
    const { user } = setup(<App />);

    await user.click(screen.getByLabelText('Delete event'));

    expect(screen.queryByText('삭제할 이벤트')).not.toBeInTheDocument();
  });
});
```

**복잡한 시나리오도 단계별로 나눕니다.**

```typescript
// ❌ 나쁜 예: 전체 플로우를 한 번에
it('일정 추가부터 알림까지 전체 플로우', async () => {
  // 일정 추가
  // 시간 대기
  // 알림 확인
  // 알림 삭제
  // ... 50줄 이상
});

// ✅ 좋은 예: 각 단계를 개별 테스트로
describe('알림 기능', () => {
  it('알림 시간이 정확히 도래한 이벤트를 반환한다', () => {
    const now = new Date('2023-05-10T09:50:00');
    const notifiedEvents: string[] = [];

    const upcomingEvents = getUpcomingEvents(events, now, notifiedEvents);

    expect(upcomingEvents).toHaveLength(1);
    expect(upcomingEvents[0].title).toBe('이벤트 1');
  });

  it('이미 알림이 간 이벤트는 제외한다', () => {
    const now = new Date('2023-05-10T13:35:00');
    const notifiedEvents: string[] = ['1'];

    const upcomingEvents = getUpcomingEvents(events, now, notifiedEvents);

    expect(upcomingEvents).toHaveLength(1);
    expect(upcomingEvents[0].title).toBe('이벤트 2');
  });

  it('알림 시간이 아직 도래하지 않은 이벤트는 반환하지 않는다', () => {
    const now = new Date('2023-05-10T09:00:00');
    const notifiedEvents: string[] = [];

    const upcomingEvents = getUpcomingEvents(events, now, notifiedEvents);

    expect(upcomingEvents).toHaveLength(0);
  });
});
```

**장점:**

1. **실패 원인 즉시 파악**: "일정 삭제 테스트 실패" vs "CRUD 테스트 실패"
2. **독립적 실행**: 각 테스트를 따로 실행 가능
3. **유지보수 용이**: 수정 시 해당 테스트만 변경
4. **명확한 의도**: 각 테스트가 무엇을 검증하는지 명확

**예외: 순차적 단계가 필요한 경우**

```typescript
// ✅ 허용되는 경우: 사용자 플로우 검증
it('검색어를 입력하고 결과를 확인한 후 검색어를 지우면 모든 결과가 다시 표시된다', async () => {
  const { user } = setup(<App />);

  // Step 1: 검색
  const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
  await user.type(searchInput, '팀 회의');
  expect(screen.getByText('팀 회의')).toBeInTheDocument();

  // Step 2: 검색어 지우기
  await user.clear(searchInput);

  // Step 3: 모든 결과 표시 확인
  expect(screen.getByText('팀 회의')).toBeInTheDocument();
  expect(screen.getByText('프로젝트 계획')).toBeInTheDocument();
});
```

**핵심 포인트:**

- 하나의 테스트 = 하나의 assertion 주제
- 순차적 의존성이 있는 플로우만 예외적으로 허용
- 실패 시 무엇이 문제인지 즉시 알 수 있어야 함

---

## 2. 테스트 네이밍 규칙

### 2.1 명확하고 구체적인 이름

```typescript
// ❌ 나쁜 예
it('test1', () => {});
it('works', () => {});
it('should return correct value', () => {});
it('validation', () => {});

// ✅ 좋은 예: [무엇을] + [어떤 상황에서] + [기대 결과]
it('빈 배열에 대해 0을 반환한다', () => {});
it('시작 시간이 종료 시간보다 늦을 때 에러 메시지를 반환한다', () => {});
it('월간 뷰에서 해당 월의 모든 이벤트를 반환한다', () => {});
it('알림 시간이 정확히 도래한 이벤트를 반환한다', () => {});
```

### 2.2 실전 예제

```typescript
describe('getUpcomingEvents', () => {
  // ✅ 정상 케이스
  it('알림 시간이 정확히 도래한 이벤트를 반환한다', () => {
    const now = new Date('2023-05-10T09:50:00');
    const upcomingEvents = getUpcomingEvents(events, now, []);
    expect(upcomingEvents).toHaveLength(1);
  });

  // ✅ 예외 케이스
  it('이미 알림이 간 이벤트는 제외한다', () => {
    const now = new Date('2023-05-10T13:35:00');
    const notifiedEvents = ['1'];
    const upcomingEvents = getUpcomingEvents(events, now, notifiedEvents);
    expect(upcomingEvents[0].id).not.toBe('1');
  });

  // ✅ 경계 케이스
  it('알림 시간이 아직 도래하지 않은 이벤트는 반환하지 않는다', () => {
    const now = new Date('2023-05-10T09:00:00');
    const upcomingEvents = getUpcomingEvents(events, now, []);
    expect(upcomingEvents).toHaveLength(0);
  });
});
```

---

## 3. 테스트 작성 기본 패턴

### 3.1 AAA 패턴 (Arrange-Act-Assert)

**Unit Test에 적합한 패턴입니다.**

```typescript
it('검색어에 맞는 이벤트만 필터링해야 한다', () => {
  // 👉 Arrange (준비): 테스트 환경 설정
  const mockEvents = [
    { id: '1', title: '회의', date: '2025-10-01' },
    { id: '2', title: '점심', date: '2025-10-02' },
  ];
  const { result } = renderHook(() => useSearch(mockEvents, currentDate, view));

  // 👉 Act (실행): 테스트할 동작 수행
  act(() => {
    result.current.setSearchTerm('회의');
  });

  // 👉 Assert (검증): 결과 확인
  expect(result.current.filteredEvents).toHaveLength(1);
  expect(result.current.filteredEvents[0].title).toBe('회의');
});
```

**핵심 포인트:**

- 각 단계가 명확히 구분되어야 함
- 준비 단계가 너무 길면 헬퍼 함수로 추출
- 하나의 테스트에서 Act는 한 번만

### 3.2 GWT 패턴 (Given-When-Then)

**BDD(Behavior-Driven Development) 스타일로, 통합 테스트나 사용자 시나리오 테스트에 적합합니다.**

```typescript
describe('일정 검색 기능', () => {
  it('검색어를 입력하면 해당 제목을 가진 일정만 리스트에 노출된다', async () => {
    // 👉 Given (주어진 상황): 초기 상태 설정
    const { user } = setup(<App />);
    const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');

    // 👉 When (어떤 동작을 하면): 사용자 액션
    await user.type(searchInput, '팀 회의');

    // 👉 Then (이런 결과가 나온다): 기대 결과
    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('팀 회의')).toBeInTheDocument();
    expect(eventList.queryByText('프로젝트 계획')).not.toBeInTheDocument();
  });
});
```

**실전 예제: 알림 기능**

```typescript
describe('알림 기능', () => {
  it('알림 시간이 정확히 도래하면 알림이 생성된다', () => {
    // Given: 10분 후 시작하는 이벤트가 있고, 5분 전 알림 설정
    const notificationTime = 5;
    const mockEvents: Event[] = [
      {
        id: 1,
        title: '테스트 이벤트',
        startTime: parseHM(Date.now() + 10 * 분),
        notificationTime,
      },
    ];
    const { result } = renderHook(() => useNotifications(mockEvents));

    // When: 정확히 5분 전 시점이 되면
    vi.setSystemTime(new Date(Date.now() + notificationTime * 분));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Then: 알림이 생성되어야 한다
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifiedEvents).toContain(1);
  });

  it('이미 알림이 간 이벤트는 제외된다', () => {
    // Given: 알림 시간이 도래했고, 이미 알림이 간 이벤트가 있을 때
    const now = new Date('2023-05-10T13:35:00');
    const notifiedEvents = ['1'];

    // When: 알림 목록을 조회하면
    const upcomingEvents = getUpcomingEvents(events, now, notifiedEvents);

    // Then: 이미 알림이 간 이벤트는 제외되어야 한다
    expect(upcomingEvents).not.toContainEqual(expect.objectContaining({ id: '1' }));
  });
});
```

### 3.3 AAA vs GWT 언제 사용할까?

| 구분       | AAA             | GWT                   |
| ---------- | --------------- | --------------------- |
| **용도**   | Unit Test       | Integration/E2E Test  |
| **관점**   | 구현 중심       | 행동/비즈니스 중심    |
| **가독성** | 개발자 친화적   | 비개발자도 이해 가능  |
| **예시**   | 유틸 함수, Hook | 사용자 시나리오, 기능 |

```typescript
// ✅ AAA 사용 예: 순수 함수 테스트
describe('getTimeErrorMessage', () => {
  it('시작 시간이 종료 시간보다 늦을 때 에러 메시지를 반환한다', () => {
    // Arrange
    const startTime = '14:00';
    const endTime = '13:00';

    // Act
    const result = getTimeErrorMessage(startTime, endTime);

    // Assert
    expect(result.startTimeError).toBe('시작 시간은 종료 시간보다 빨라야 합니다.');
  });
});

// ✅ GWT 사용 예: 사용자 시나리오 테스트
describe('일정 충돌 검증', () => {
  it('겹치는 시간에 새 일정을 추가하면 경고가 표시된다', async () => {
    // Given: 기존 회의가 09:00-10:00에 있을 때
    setupMockHandlerCreation([
      {
        id: '1',
        title: '기존 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
      },
    ]);
    const { user } = setup(<App />);

    // When: 09:30-10:30에 새 회의를 추가하면
    await saveSchedule(user, {
      title: '새 회의',
      date: '2025-10-15',
      startTime: '09:30',
      endTime: '10:30',
    });

    // Then: 일정 충돌 경고가 표시되어야 한다
    expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
    expect(screen.getByText(/다음 일정과 겹칩니다/)).toBeInTheDocument();
  });
});
```

**핵심 포인트:**

- **AAA**: "어떻게(How)" - 기술적 구현에 집중
- **GWT**: "무엇을(What)" - 비즈니스 가치에 집중
- 프로젝트 컨벤션에 따라 선택하거나 혼용 가능
- 중요한 것은 일관성

### 3.4 독립성 보장

```typescript
// ❌ 나쁜 예: 전역 상태 공유
let sharedUser;

it('사용자를 생성한다', () => {
  sharedUser = createUser('test');
  expect(sharedUser).toBeDefined();
});

it('사용자를 삭제한다', () => {
  deleteUser(sharedUser); // 첫 번째 테스트에 의존
});

// ✅ 좋은 예: 각 테스트가 독립적
it('사용자를 생성한다', () => {
  const user = createUser('test');
  expect(user).toBeDefined();
});

it('사용자를 삭제한다', () => {
  const user = createUser('test'); // 자체적으로 준비
  deleteUser(user);
  expect(getUser('test')).toBeNull();
});
```

---

## 4. 경계값과 엣지 케이스

### 4.1 경계값 테스트

```typescript
describe('getDaysInMonth', () => {
  // 정상 케이스
  it('1월은 31일 수를 반환한다', () => {
    expect(getDaysInMonth(2025, 1)).toBe(31);
  });

  // 엣지 케이스: 윤년
  it('윤년의 2월에 대해 29일을 반환한다', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
  });

  it('평년의 2월에 대해 28일을 반환한다', () => {
    expect(getDaysInMonth(2023, 2)).toBe(28);
  });

  // 엣지 케이스: 유효하지 않은 입력
  it('유효하지 않은 월에 대해 적절히 처리한다', () => {
    expect(getDaysInMonth(2025, 0)).toBe(31);
    expect(getDaysInMonth(2025, 13)).toBe(31);
  });
});
```

### 4.2 경계값 체크리스트

**숫자:**

- [ ] 0, 음수, 최대값
- [ ] 정수, 소수

**문자열:**

- [ ] 빈 문자열 `''`
- [ ] 공백만 있는 문자열 `'   '`
- [ ] 특수문자 포함

**배열:**

- [ ] 빈 배열 `[]`
- [ ] 단일 요소 배열
- [ ] 중복 요소

**날짜/시간:**

- [ ] 월말 (28일, 29일, 30일, 31일)
- [ ] 연말 (12월 31일)
- [ ] 윤년/평년
- [ ] 자정 (00:00)

**null/undefined:**

- [ ] null 입력
- [ ] undefined 입력

---

## 5. 시간 테스트 전략

### 5.1 시간 상수 정의

```typescript
const 초 = 1000;
const 분 = 초 * 60;
const 시간 = 분 * 60;

// 사용 예
vi.advanceTimersByTime(10 * 분);
vi.setSystemTime(new Date(Date.now() + 5 * 분));
```

### 5.2 시스템 시간 고정

```typescript
it('지정된 시간이 된 경우 알림이 새롭게 생성되어 추가된다', () => {
  const notificationTime = 5;
  const mockEvents: Event[] = [
    {
      id: 1,
      title: '테스트 이벤트',
      date: formatDate(new Date()),
      startTime: parseHM(Date.now() + 10 * 분),
      endTime: parseHM(Date.now() + 20 * 분),
      notificationTime,
    },
  ];

  const { result } = renderHook(() => useNotifications(mockEvents));

  expect(result.current.notifications).toHaveLength(0);

  vi.setSystemTime(new Date(Date.now() + notificationTime * 분));

  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(result.current.notifications).toHaveLength(1);
});
```

### 5.3 중복 알림 방지 테스트

```typescript
it('이미 알림이 발생한 이벤트에 대해서는 중복 알림이 발생하지 않아야 한다', () => {
  const mockEvents: Event[] = [
    {
      id: 1,
      title: '테스트 이벤트',
      date: formatDate(new Date()),
      startTime: parseHM(Date.now() + 10 * 분),
      endTime: parseHM(Date.now() + 20 * 분),
      notificationTime: 10,
    },
  ];

  const { result } = renderHook(() => useNotifications(mockEvents));

  vi.setSystemTime(new Date(Date.now() + 5 * 분));
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  vi.setSystemTime(new Date(Date.now() + 20 * 분));
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(result.current.notifications).toHaveLength(1);
});
```

---

## 6. API Mock 전략 (MSW)

### 6.1 시나리오별 Mock Handler

```typescript
// 생성 시나리오
export const setupMockHandlerCreation = (initEvents: Event[] = []) => {
  const mockEvents: Event[] = [...initEvents];

  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json({ events: mockEvents });
    }),
    http.post('/api/events', async ({ request }) => {
      const newEvent = await request.json();
      newEvent.id = String(mockEvents.length + 1);
      mockEvents.push(newEvent);
      return HttpResponse.json(newEvent, { status: 201 });
    })
  );
};

// 수정 시나리오
export const setupMockHandlerUpdating = () => {
  const mockEvents: Event[] = [
    {
      id: '1',
      title: '기존 회의',
      date: '2025-10-15',
      startTime: '09:00',
      endTime: '10:00',
    },
  ];

  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json({ events: mockEvents });
    }),
    http.put('/api/events/:id', async ({ params, request }) => {
      const { id } = params;
      const updatedEvent = await request.json();
      const index = mockEvents.findIndex((event) => event.id === id);

      mockEvents[index] = { ...mockEvents[index], ...updatedEvent };
      return HttpResponse.json(mockEvents[index]);
    })
  );
};
```

### 6.2 에러 시나리오 테스트

```typescript
it("이벤트 로딩 실패 시 '이벤트 로딩 실패' 토스트가 표시되어야 한다", async () => {
  server.use(
    http.get('/api/events', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  renderHook(() => useEventOperations(true));

  await act(() => Promise.resolve(null));

  expect(enqueueSnackbarFn).toHaveBeenCalledWith('이벤트 로딩 실패', {
    variant: 'error',
  });

  server.resetHandlers();
});
```

---

## 7. React Hook 테스트

### 7.1 기본 Hook 테스트

```typescript
describe('useCalendarView', () => {
  it('view는 "month"이어야 한다', () => {
    const { result } = renderHook(() => useCalendarView());
    expect(result.current.view).toBe('month');
  });

  it("view를 'week'으로 변경 시 적절하게 반영된다", () => {
    const { result } = renderHook(() => useCalendarView());

    act(() => {
      result.current.setView('week');
    });

    expect(result.current.view).toBe('week');
  });
});
```

### 7.2 비동기 Hook 테스트

```typescript
it('저장되어있는 초기 이벤트 데이터를 적절하게 불러온다', async () => {
  const { result } = renderHook(() => useEventOperations(false));

  await act(() => Promise.resolve(null));

  expect(result.current.events).toHaveLength(1);
  expect(result.current.events[0].title).toBe('기존 회의');
});

it('정의된 이벤트 정보를 기준으로 적절하게 저장이 된다', async () => {
  setupMockHandlerCreation();

  const { result } = renderHook(() => useEventOperations(false));

  await act(() => Promise.resolve(null));

  const newEvent: Event = {
    id: '1',
    title: '새 회의',
    date: '2025-10-16',
    startTime: '11:00',
    endTime: '12:00',
  };

  await act(async () => {
    await result.current.saveEvent(newEvent);
  });

  expect(result.current.events).toContainEqual(expect.objectContaining({ title: '새 회의' }));
});
```

---

## 8. 컴포넌트 통합 테스트

### 8.1 사용자 시나리오 테스트

```typescript
it('입력한 새로운 일정 정보에 맞춰 모든 필드가 이벤트 리스트에 정확히 저장된다', async () => {
  setupMockHandlerCreation();

  const { user } = setup(<App />);

  await user.click(screen.getAllByText('일정 추가')[0]);
  await user.type(screen.getByLabelText('제목'), '새 회의');
  await user.type(screen.getByLabelText('날짜'), '2025-10-15');
  await user.type(screen.getByLabelText('시작 시간'), '14:00');
  await user.type(screen.getByLabelText('종료 시간'), '15:00');
  await user.click(screen.getByTestId('event-submit-button'));

  const eventList = within(screen.getByTestId('event-list'));
  expect(eventList.getByText('새 회의')).toBeInTheDocument();
  expect(eventList.getByText('2025-10-15')).toBeInTheDocument();
});
```

### 8.2 검색 기능 테스트

```typescript
it('검색 결과가 없으면, "검색 결과가 없습니다."가 표시되어야 한다', async () => {
  const { user } = setup(<App />);

  const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
  await user.type(searchInput, '존재하지 않는 일정');

  const eventList = within(screen.getByTestId('event-list'));
  expect(eventList.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
});
```

---

## 9. 테스트 헬퍼 패턴

### 9.1 날짜 비교 헬퍼

```typescript
export const assertDate = (date1: Date, date2: Date) => {
  expect(date1.toISOString()).toBe(date2.toISOString());
};

// 사용 예
it('currentDate는 오늘 날짜여야 한다', () => {
  const { result } = renderHook(() => useCalendarView());
  assertDate(result.current.currentDate, new Date('2025-10-01'));
});
```

### 9.2 시간 파싱 헬퍼

```typescript
export const parseHM = (timestamp: number) => {
  const date = new Date(timestamp);
  const h = fillZero(date.getHours());
  const m = fillZero(date.getMinutes());
  return `${h}:${m}`;
};
```

### 9.3 Mock 데이터 생성 헬퍼

```typescript
const createMockEvent = (overrides: Partial<Event> = {}): Event => ({
  id: '1',
  title: 'Test Event',
  date: '2025-10-01',
  startTime: '10:00',
  endTime: '11:00',
  description: '',
  location: '',
  category: '',
  repeat: { type: 'none', interval: 0 },
  notificationTime: 10,
  ...overrides,
});

// 사용 예
const mockEvents = [
  createMockEvent({ id: '1', title: '회의' }),
  createMockEvent({ id: '2', title: '점심', startTime: '12:00' }),
];
```

---

## 10. 테스트 구조화 전략

### 10.1 describe로 논리적 그룹화

```typescript
describe('dateUtils', () => {
  describe('fillZero', () => {
    it("5를 2자리로 변환하면 '05'를 반환한다", () => {});
  });

  describe('getDaysInMonth', () => {
    describe('정상 케이스', () => {
      it('1월은 31일 수를 반환한다', () => {});
    });

    describe('엣지 케이스', () => {
      it('윤년의 2월에 대해 29일을 반환한다', () => {});
    });
  });
});
```

### 10.2 beforeEach/afterEach 활용

```typescript
describe('검색 기능', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({
          events: [
            { id: 1, title: '팀 회의' },
            { id: 2, title: '프로젝트 계획' },
          ],
        });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('테스트 1', () => {});
  it('테스트 2', () => {});
});
```

---

## 11. 안티패턴 & 주의사항

### 11.1 ❌ 구현 세부사항 테스트

```typescript
// ❌ 나쁜 예
it('useState를 사용한다', () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current.state).toBeDefined();
});

// ✅ 좋은 예
it('카운터가 증가한다', () => {
  const { result } = renderHook(() => useCounter());
  act(() => {
    result.current.increment();
  });
  expect(result.current.count).toBe(1);
});
```

### 11.2 ❌ 테스트에 로직 작성

```typescript
// ❌ 나쁜 예
it('짝수만 필터링', () => {
  const result = filterEvenNumbers([1, 2, 3, 4, 5]);
  const expected = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i] % 2 === 0) {
      expected.push(result[i]);
    }
  }
  expect(result).toEqual(expected);
});

// ✅ 좋은 예
it('짝수만 필터링', () => {
  const result = filterEvenNumbers([1, 2, 3, 4, 5]);
  expect(result).toEqual([2, 4]);
});
```

### 11.3 ❌ 과도한 Mocking

```typescript
// ❌ 나쁜 예: 모든 것을 mock
vi.mock('../../utils/dateUtils');
vi.mock('../../utils/eventUtils');
vi.mock('../../hooks/useEvents');

// ✅ 좋은 예: 필요한 것만 mock
// 외부 API나 시간만 mock하고 실제 로직은 테스트
```

### 11.4 ❌ 매직 넘버/문자열

```typescript
// ❌ 나쁜 예
vi.advanceTimersByTime(300000);
expect(result).toHaveLength(3);

// ✅ 좋은 예
const 분 = 1000 * 60;
const EXPECTED_COUNT = 3;

vi.advanceTimersByTime(5 * 분);
expect(result).toHaveLength(EXPECTED_COUNT);
```

---

## 12. 테스트 체크리스트

### ✅ 테스트 작성 전

- [ ] 이 코드는 테스트가 필요한가? (간단한 유틸은 생략 고려)
- [ ] 정상 케이스와 예외 케이스를 정리했는가?
- [ ] 경계값을 파악했는가?

### ✅ 테스트 작성 중

#### 4대 원칙 준수

- [ ] 인터페이스(Public API)를 테스트하는가?
- [ ] 의미있는 테스트인가? (커버리지 목적 아님)
- [ ] 테스트 코드가 읽기 쉬운가?
- [ ] 하나의 테스트가 하나의 동작만 검증하는가?

#### 기본 원칙

- [ ] 테스트 이름이 명확한가?
- [ ] AAA 패턴을 따르는가?
- [ ] 독립적으로 실행 가능한가?

#### 코드 품질

- [ ] 매직 넘버/문자열을 상수로 추출했는가?
- [ ] 중복 코드를 헬퍼로 추출했는가?
- [ ] 구현 세부사항이 아닌 동작을 테스트하는가?

### ✅ 테스트 작성 후

- [ ] 테스트가 통과하는가?
- [ ] 의도적으로 실패시켜봤는가?
- [ ] 정상/예외/경계 케이스를 모두 커버하는가?
- [ ] 다른 개발자가 이해하기 쉬운가?

---

## 빠른 참조

### 자주 사용하는 Matcher

```typescript
// 동등성
expect(value).toBe(expected);
expect(object).toEqual(expectedObject);
expect(array).toContain(item);

// 존재성
expect(element).toBeInTheDocument();
expect(value).toBeDefined();
expect(value).toBeNull();

// 함수 호출
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

// 배열/객체
expect(array).toHaveLength(3);
expect(object).toHaveProperty('key', 'value');
```

### 시간 상수

```typescript
const 초 = 1000;
const 분 = 초 * 60;
const 시간 = 분 * 60;
```

### 명령어

```bash
pnpm test          # 테스트 실행
pnpm test:ui       # UI 모드
pnpm test:coverage # 커버리지 확인
```

---

## 마무리

### 좋은 테스트 코드의 특징

1. **인터페이스를 테스트** - 내부 구현이 아닌 Public API
2. **의미있는 테스트** - 커버리지가 아닌 가치 중심
3. **읽기 쉬운 코드** - 테스트 자체가 문서
4. **하나의 동작** - 명확하고 집중된 검증
5. **독립적** - 다른 테스트에 영향받지 않음

**행복한 테스트 작성 되세요! 🚀**
