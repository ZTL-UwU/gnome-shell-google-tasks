import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const REFRESH_INTERVAL_KEY = 'refresh-interval';
const TASK_SORT_ORDER_KEY = 'task-sort-order';
const SHOW_COMPLETED_TASKS_KEY = 'show-completed-tasks';
const TASK_TIMEFRAME_KEY = 'task-timeframe';

const SORT_OPTIONS = [
  { id: 'my-order', label: 'My order' },
  { id: 'date', label: 'Date' },
  { id: 'deadline', label: 'Deadline' },
  { id: 'starred-recently', label: 'Starred recently' },
  { id: 'title', label: 'Title' },
];

const TIMEFRAME_OPTIONS = [
  { id: 'all', label: 'All tasks' },
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'This week' },
  { id: 'this-month', label: 'This month' },
];

export default class GoogleTasksPreferences extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({
      title: 'General',
    });

    const refreshIntervalRow = new Adw.SpinRow({
      title: 'Refresh interval',
      subtitle: 'How often to sync tasks (seconds). Note: Google Tasks API has a quota of 50,000 requests per day.',
      adjustment: new Gtk.Adjustment({
        lower: 5,
        upper: 3600,
        step_increment: 5,
        page_increment: 30,
      }),
      digits: 0,
      numeric: true,
    });

    settings.bind(REFRESH_INTERVAL_KEY, refreshIntervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);

    const sortRow = new Adw.ComboRow({
      title: 'Sort by',
      model: Gtk.StringList.new(SORT_OPTIONS.map(option => option.label)),
    });

    const currentSortOrder = settings.get_string(TASK_SORT_ORDER_KEY);
    const currentSortOrderIndex = Math.max(0, SORT_OPTIONS.findIndex(option => option.id === currentSortOrder));
    sortRow.selected = currentSortOrderIndex;

    sortRow.connect('notify::selected', () => {
      const selectedOption = SORT_OPTIONS[sortRow.selected];
      if (selectedOption)
        settings.set_string(TASK_SORT_ORDER_KEY, selectedOption.id);
    });

    const showCompletedRow = new Adw.SwitchRow({
      title: 'Show completed tasks',
      subtitle: 'Display a collapsible section for completed tasks in the panel.',
    });

    settings.bind(SHOW_COMPLETED_TASKS_KEY, showCompletedRow, 'active', Gio.SettingsBindFlags.DEFAULT);

    const timeframeRow = new Adw.ComboRow({
      title: 'Timeframe',
      subtitle: 'Show tasks due within the selected range.',
      model: Gtk.StringList.new(TIMEFRAME_OPTIONS.map(option => option.label)),
    });

    const currentTimeframe = settings.get_string(TASK_TIMEFRAME_KEY);
    const currentTimeframeIndex = Math.max(0, TIMEFRAME_OPTIONS.findIndex(option => option.id === currentTimeframe));
    timeframeRow.selected = currentTimeframeIndex;

    timeframeRow.connect('notify::selected', () => {
      const selectedOption = TIMEFRAME_OPTIONS[timeframeRow.selected];
      if (selectedOption)
        settings.set_string(TASK_TIMEFRAME_KEY, selectedOption.id);
    });

    group.add(refreshIntervalRow);
    group.add(sortRow);
    group.add(showCompletedRow);
    group.add(timeframeRow);
    page.add(group);
    window.add(page);
  }
}
