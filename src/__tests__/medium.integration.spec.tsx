import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within, act } from '@testing-library/react';
import { UserEvent, userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';

import {
  setupMockHandlerCreation,
  setupMockHandlerDeletion,
  setupMockHandlerUpdating,
} from '../__mocks__/handlersUtils';
import App from '../App';
import { server } from '../setupTests';
import { Event } from '../types';

const theme = createTheme();

// ! Hard 여기 제공 안함
const setup = (element: ReactElement) => {
  const user = userEvent.setup();

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>{element}</SnackbarProvider>
      </ThemeProvider>
    ),
    user,
  };
};

// ! Hard 여기 제공 안함
const saveSchedule = async (
  user: UserEvent,
  form: Omit<Event, 'id' | 'notificationTime' | 'repeat'>
) => {
  const { title, date, startTime, endTime, location, description, category } = form;

  await user.click(screen.getAllByText('일정 추가')[0]);

  await user.type(screen.getByLabelText('제목'), title);
  await user.type(screen.getByLabelText('날짜'), date);
  await user.type(screen.getByLabelText('시작 시간'), startTime);
  await user.type(screen.getByLabelText('종료 시간'), endTime);
  await user.type(screen.getByLabelText('설명'), description);
  await user.type(screen.getByLabelText('위치'), location);
  await user.click(screen.getByLabelText('카테고리'));
  await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: `${category}-option` }));

  await user.click(screen.getByTestId('event-submit-button'));
};

describe('일정 CRUD 및 기본 기능', () => {
  it('입력한 새로운 일정 정보에 맞춰 모든 필드가 이벤트 리스트에 정확히 저장된다.', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);

    await saveSchedule(user, {
      title: '새 회의',
      date: '2025-10-15',
      startTime: '14:00',
      endTime: '15:00',
      description: '프로젝트 진행 상황 논의',
      location: '회의실 A',
      category: '업무',
    });

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('새 회의')).toBeInTheDocument();
    expect(eventList.getByText('2025-10-15')).toBeInTheDocument();
    expect(eventList.getByText('14:00 - 15:00')).toBeInTheDocument();
    expect(eventList.getByText('프로젝트 진행 상황 논의')).toBeInTheDocument();
    expect(eventList.getByText('회의실 A')).toBeInTheDocument();
    expect(eventList.getByText('카테고리: 업무')).toBeInTheDocument();
  });

  it('기존 일정의 세부 정보를 수정하고 변경사항이 정확히 반영된다', async () => {
    const { user } = setup(<App />);

    setupMockHandlerUpdating();

    await user.click(await screen.findByLabelText('Edit event'));

    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '수정된 회의');
    await user.clear(screen.getByLabelText('설명'));
    await user.type(screen.getByLabelText('설명'), '회의 내용 변경');

    await user.click(screen.getByTestId('event-submit-button'));

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('수정된 회의')).toBeInTheDocument();
    expect(eventList.getByText('회의 내용 변경')).toBeInTheDocument();
  });

  it('일정을 삭제하고 더 이상 조회되지 않는지 확인한다', async () => {
    setupMockHandlerDeletion();

    const { user } = setup(<App />);
    const eventList = within(screen.getByTestId('event-list'));
    expect(await eventList.findByText('삭제할 이벤트')).toBeInTheDocument();

    // 삭제 버튼 클릭
    const allDeleteButton = await screen.findAllByLabelText('Delete event');
    await user.click(allDeleteButton[0]);

    expect(eventList.queryByText('삭제할 이벤트')).not.toBeInTheDocument();
  });
});

describe('일정 뷰', () => {
  it('주별 뷰를 선택 후 해당 주에 일정이 없으면, 일정이 표시되지 않는다.', async () => {
    // ! 현재 시스템 시간 2025-10-01
    const { user } = setup(<App />);

    await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'week-option' }));

    // ! 일정 로딩 완료 후 테스트
    await screen.findByText('일정 로딩 완료!');

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('주별 뷰 선택 후 해당 일자에 일정이 존재한다면 해당 일정이 정확히 표시된다', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);
    await saveSchedule(user, {
      title: '이번주 팀 회의',
      date: '2025-10-02',
      startTime: '09:00',
      endTime: '10:00',
      description: '이번주 팀 회의입니다.',
      location: '회의실 A',
      category: '업무',
    });

    await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'week-option' }));

    const weekView = within(screen.getByTestId('week-view'));
    expect(weekView.getByText('이번주 팀 회의')).toBeInTheDocument();
  });

  it('월별 뷰에 일정이 없으면, 일정이 표시되지 않아야 한다.', async () => {
    vi.setSystemTime(new Date('2025-01-01'));

    setup(<App />);

    // ! 일정 로딩 완료 후 테스트
    await screen.findByText('일정 로딩 완료!');

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('월별 뷰에 일정이 정확히 표시되는지 확인한다', async () => {
    setupMockHandlerCreation();

    const { user } = setup(<App />);
    await saveSchedule(user, {
      title: '이번달 팀 회의',
      date: '2025-10-02',
      startTime: '09:00',
      endTime: '10:00',
      description: '이번달 팀 회의입니다.',
      location: '회의실 A',
      category: '업무',
    });

    const monthView = within(screen.getByTestId('month-view'));
    expect(monthView.getByText('이번달 팀 회의')).toBeInTheDocument();
  });

  it('달력에 1월 1일(신정)이 공휴일로 표시되는지 확인한다', async () => {
    vi.setSystemTime(new Date('2025-01-01'));
    setup(<App />);

    const monthView = screen.getByTestId('month-view');

    // 1월 1일 셀 확인
    const januaryFirstCell = within(monthView).getByText('1').closest('td')!;
    expect(within(januaryFirstCell).getByText('신정')).toBeInTheDocument();
  });
});

describe('검색 기능', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({
          events: [
            {
              id: 1,
              title: '팀 회의',
              date: '2025-10-15',
              startTime: '09:00',
              endTime: '10:00',
              description: '주간 팀 미팅',
              location: '회의실 A',
              category: '업무',
              repeat: { type: 'none', interval: 0 },
              notificationTime: 10,
            },
            {
              id: 2,
              title: '프로젝트 계획',
              date: '2025-10-16',
              startTime: '14:00',
              endTime: '15:00',
              description: '새 프로젝트 계획 수립',
              location: '회의실 B',
              category: '업무',
              repeat: { type: 'none', interval: 0 },
              notificationTime: 10,
            },
          ],
        });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('검색 결과가 없으면, "검색 결과가 없습니다."가 표시되어야 한다.', async () => {
    const { user } = setup(<App />);

    const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
    await user.type(searchInput, '존재하지 않는 일정');

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it("'팀 회의'를 검색하면 해당 제목을 가진 일정이 리스트에 노출된다", async () => {
    const { user } = setup(<App />);

    const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
    await user.type(searchInput, '팀 회의');

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('팀 회의')).toBeInTheDocument();
  });

  it('검색어를 지우면 모든 일정이 다시 표시되어야 한다', async () => {
    const { user } = setup(<App />);

    const searchInput = screen.getByPlaceholderText('검색어를 입력하세요');
    await user.type(searchInput, '팀 회의');
    await user.clear(searchInput);

    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('팀 회의')).toBeInTheDocument();
    expect(eventList.getByText('프로젝트 계획')).toBeInTheDocument();
  });
});

describe('일정 충돌', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('겹치는 시간에 새 일정을 추가할 때 경고가 표시된다', async () => {
    setupMockHandlerCreation([
      {
        id: '1',
        title: '기존 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '기존 팀 미팅',
        location: '회의실 B',
        category: '업무',
        repeat: { type: 'none', interval: 0 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    await saveSchedule(user, {
      title: '새 회의',
      date: '2025-10-15',
      startTime: '09:30',
      endTime: '10:30',
      description: '설명',
      location: '회의실 A',
      category: '업무',
    });

    expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
    expect(screen.getByText(/다음 일정과 겹칩니다/)).toBeInTheDocument();
    expect(screen.getByText('기존 회의 (2025-10-15 09:00-10:00)')).toBeInTheDocument();
  });

  it('기존 일정의 시간을 수정하여 충돌이 발생하면 경고가 노출된다', async () => {
    setupMockHandlerUpdating();

    const { user } = setup(<App />);

    const editButton = (await screen.findAllByLabelText('Edit event'))[1];
    await user.click(editButton);

    // 시간 수정하여 다른 일정과 충돌 발생
    await user.clear(screen.getByLabelText('시작 시간'));
    await user.type(screen.getByLabelText('시작 시간'), '08:30');
    await user.clear(screen.getByLabelText('종료 시간'));
    await user.type(screen.getByLabelText('종료 시간'), '10:30');

    await user.click(screen.getByTestId('event-submit-button'));

    expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
    expect(screen.getByText(/다음 일정과 겹칩니다/)).toBeInTheDocument();
    expect(screen.getByText('기존 회의 (2025-10-15 09:00-10:00)')).toBeInTheDocument();
  });
});

it('notificationTime을 10으로 하면 지정 시간 10분 전 알람 텍스트가 노출된다', async () => {
  vi.setSystemTime(new Date('2025-10-15 08:49:59'));

  setup(<App />);

  // ! 일정 로딩 완료 후 테스트
  await screen.findByText('일정 로딩 완료!');

  expect(screen.queryByText('10분 후 기존 회의 일정이 시작됩니다.')).not.toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(screen.getByText('10분 후 기존 회의 일정이 시작됩니다.')).toBeInTheDocument();
});

/**
 * 🔴 RED: 반복 일정 기능 통합 테스트
 */
describe('반복 일정', () => {
  it('반복 일정 생성, 표시, 수정, 삭제가 올바르게 작동해야 한다', async () => {
    // Arrange
    setupMockHandlerCreation();
    setupMockHandlerUpdating();
    setupMockHandlerDeletion();
    const { user } = setup(<App />);

    // 일정 로딩 완료 대기
    await screen.findByText('일정 로딩 완료!');

    // 1. 매일 반복 일정 생성
    await user.click(screen.getAllByText('일정 추가')[0]);
    await user.type(screen.getByLabelText('제목'), '매일 반복 회의');
    await user.type(screen.getByLabelText('날짜'), '2024-07-01');
    await user.type(screen.getByLabelText('시작 시간'), '10:00');
    await user.type(screen.getByLabelText('종료 시간'), '11:00');
    await user.type(screen.getByLabelText('설명'), '매일 반복');
    await user.type(screen.getByLabelText('위치'), '회의실');
    await user.click(screen.getByLabelText('카테고리'));
    await user.click(within(screen.getByLabelText('카테고리')).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '업무-option' }));

    // 반복 설정
    await user.click(screen.getByLabelText('반복 설정'));

    // 🔴 실패 예상: 반복 유형 Select가 나타나지 않음
    const repeatTypeSelect = await screen.findByLabelText('반복 유형');
    await user.click(within(repeatTypeSelect).getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '매일-option' }));
    await user.type(screen.getByLabelText('반복 간격'), '1');
    await user.type(screen.getByLabelText('반복 종료일'), '2024-07-03');

    await act(async () => {
      await user.click(screen.getByTestId('event-submit-button'));
    });

    // 🔴 실패 예상: 반복 일정이 생성되지 않음
    const recurringEvents = await screen.findAllByText(/매일 반복 회의/);
    expect(recurringEvents.length).toBeGreaterThan(1);

    // 2. 반복 일정 아이콘 확인
    // 🔴 실패 예상: data-recurring 속성이 없음
    const firstEvent = screen.getAllByText(/매일 반복 회의/)[0].closest('[data-testid*="event"]');
    expect(firstEvent).toHaveAttribute('data-recurring', 'true');

    // 3. 일반 일정 생성 (비교용)
    await saveSchedule(user, {
      title: '일반 회의',
      date: '2024-07-01',
      startTime: '14:00',
      endTime: '15:00',
      description: '일반 일정',
      location: '회의실 B',
      category: '업무',
    });

    await act(async () => {
      await user.click(screen.getByTestId('event-submit-button'));
    });

    // 일반 일정은 data-recurring 속성이 없어야 함
    const normalEvent = (await screen.findByText('일반 회의')).closest('[data-testid*="event"]');
    expect(normalEvent).not.toHaveAttribute('data-recurring', 'true');

    // 4. 반복 일정 단일 수정
    const eventToEdit = screen.getAllByText(/매일 반복 회의/)[1];
    await user.click(eventToEdit);

    const editButtons = screen.getAllByLabelText('Edit event');
    await user.click(editButtons[0]);

    // 🔴 실패 예상: 수정 확인 다이얼로그가 나타나지 않음
    expect(await screen.findByText('해당 일정만 수정하시겠어요?')).toBeInTheDocument();

    // 단일 수정 선택
    await user.click(screen.getByRole('button', { name: '예' }));

    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '단일 수정된 회의');

    await act(async () => {
      await user.click(screen.getByTestId('event-submit-button'));
    });

    // 🔴 실패 예상: 단일 수정된 일정이 일반 일정으로 변경되지 않음
    const editedEvent = (await screen.findByText('단일 수정된 회의')).closest(
      '[data-testid*="event"]'
    );
    expect(editedEvent).not.toHaveAttribute('data-recurring', 'true');

    // 나머지 반복 일정은 여전히 반복 아이콘 유지
    const remainingEvents = screen.getAllByText(/매일 반복 회의/);
    expect(remainingEvents.length).toBeGreaterThan(0);

    // 5. 반복 일정 전체 수정
    const anotherEvent = screen.getAllByText(/매일 반복 회의/)[0];
    await user.click(anotherEvent);

    const editButtons2 = screen.getAllByLabelText('Edit event');
    await user.click(editButtons2[0]);

    expect(await screen.findByText('해당 일정만 수정하시겠어요?')).toBeInTheDocument();

    // 전체 수정 선택
    await user.click(screen.getByRole('button', { name: '아니오' }));

    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '전체 수정된 회의');

    await act(async () => {
      await user.click(screen.getByTestId('event-submit-button'));
    });

    // 🔴 실패 예상: 모든 반복 일정이 수정되지 않음
    const allEditedEvents = await screen.findAllByText(/전체 수정된 회의/);
    expect(allEditedEvents.length).toBeGreaterThan(1);

    // 모든 반복 일정은 여전히 data-recurring 유지
    allEditedEvents.forEach((event) => {
      const eventElement = event.closest('[data-testid*="event"]');
      expect(eventElement).toHaveAttribute('data-recurring', 'true');
    });

    // 6. 반복 일정 단일 삭제
    const eventToDelete = screen.getAllByText(/전체 수정된 회의/)[0];
    await user.click(eventToDelete);

    const deleteButtons = screen.getAllByLabelText('Delete event');
    await user.click(deleteButtons[0]);

    // 🔴 실패 예상: 삭제 확인 다이얼로그가 나타나지 않음
    expect(await screen.findByText('해당 일정만 삭제하시겠어요?')).toBeInTheDocument();

    // 단일 삭제 선택
    await user.click(screen.getByRole('button', { name: '예' }));

    // 🔴 실패 예상: 해당 일정만 삭제되지 않음
    const remainingAfterSingleDelete = await screen.findAllByText(/전체 수정된 회의/);
    expect(remainingAfterSingleDelete.length).toBeGreaterThan(0);

    // 7. 반복 일정 전체 삭제
    const lastEvent = screen.getAllByText(/전체 수정된 회의/)[0];
    await user.click(lastEvent);

    const deleteButtons2 = screen.getAllByLabelText('Delete event');
    await user.click(deleteButtons2[0]);

    expect(await screen.findByText('해당 일정만 삭제하시겠어요?')).toBeInTheDocument();

    // 전체 삭제 선택
    await user.click(screen.getByRole('button', { name: '아니오' }));

    // 🔴 실패 예상: 모든 반복 일정이 삭제되지 않음
    await act(async () => {
      // 약간의 대기 시간
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(screen.queryByText(/전체 수정된 회의/)).not.toBeInTheDocument();
  });
});
