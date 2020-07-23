import { mount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import VueRouter from 'vue-router';
import cloneDeep from 'lodash/cloneDeep';
import flushPromises from 'flush-promises';

import { RouterNames } from '../../constants';
import StagingTreeView from './index';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const NODE_ID = 'id-reading';

const GETTERS = {
  global: {
    isCompactViewMode: jest.fn(),
  },
  currentChannel: {
    currentChannel: () => jest.fn(),
    rootId: jest.fn(),
    stagingId: jest.fn(),
    hasStagingTree: jest.fn(),
    getCurrentChannelStagingDiff: jest.fn(),
  },
  contentNode: {
    getTreeNodeChildren: () => jest.fn(),
    getContentNodeChildren: () => jest.fn(),
    getContentNodeAncestors: () => jest.fn(),
    getContentNode: () => jest.fn(),
  },
};

const ACTIONS = {
  global: {
    showSnackbar: jest.fn(),
    addViewModeOverride: jest.fn(),
    removeViewModeOverride: jest.fn(),
  },
  channel: {
    loadChannel: jest.fn(),
  },
  currentChannel: {
    loadCurrentChannelStagingDiff: jest.fn(),
    deployCurrentChannel: jest.fn(),
  },
  contentNode: {
    loadAncestors: jest.fn(),
    loadChildren: jest.fn(),
    loadContentNode: jest.fn(),
  },
};

const MUTATIONS = {
  contentNode: {
    COLLAPSE_ALL_EXPANDED: jest.fn(),
    SET_EXPANSION: jest.fn(),
  },
};

const initWrapper = ({ getters = GETTERS, actions = ACTIONS, mutations = MUTATIONS } = {}) => {
  const router = new VueRouter({
    routes: [
      { path: '/' },
      {
        name: RouterNames.STAGING_TREE_VIEW,
        path: '/staging/:nodeId/:detailNodeId?',
      },
      {
        name: RouterNames.TREE_VIEW,
        path: '/:nodeId/:detailNodeId?',
      },
    ],
  });

  const store = new Store({
    getters: getters.global,
    actions: actions.global,
    modules: {
      channel: {
        namespaced: true,
        actions: actions.channel,
      },
      currentChannel: {
        namespaced: true,
        getters: getters.currentChannel,
        actions: actions.currentChannel,
      },
      contentNode: {
        namespaced: true,
        getters: getters.contentNode,
        actions: actions.contentNode,
        mutations: mutations.contentNode,
      },
    },
  });

  return mount(StagingTreeView, {
    propsData: {
      nodeId: NODE_ID,
    },
    localVue,
    router,
    store,
  });
};

const removeMultipleSpaces = str => str.replace(/\s{2,}/g, ' ');

const getContentNodeListItems = wrapper => {
  return wrapper.findAll('[data-test="node-list-item"]');
};

const containsChevronRightBtn = wrapper => {
  return wrapper.contains('[data-test="btn-chevron"]');
};

const getChevronRightBtn = wrapper => {
  return wrapper.find('[data-test="btn-chevron"]');
};

const getInfoBtn = wrapper => {
  return wrapper.find('[data-test="btn-info"]');
};

const containsResourceDetailDrawer = wrapper => {
  return wrapper.contains('[data-test="resource-detail-drawer"]');
};

const getBottomBarStatsResourcesCount = wrapper => {
  return wrapper.find('[data-test="bottom-bar-stats-resources-count"]');
};

const getBottomBarStatsFileSize = wrapper => {
  return wrapper.find('[data-test="bottom-bar-stats-file-size"]');
};

const getSummaryDetailsDialog = wrapper => {
  return wrapper.find('[data-test="summary-details-dialog"]');
};

const getDisplaySummaryDetailsDialogBtn = wrapper => {
  return wrapper.find('[data-test="display-summary-details-dialog-btn"]');
};

const getDeployDialog = wrapper => {
  return wrapper.find('[data-test="deploy-dialog"]');
};

const getDisplayDeployDialogBtn = wrapper => {
  return wrapper.find('[data-test="display-deploy-dialog-btn"]');
};

const getDeployDialogLiveResources = wrapper => {
  return wrapper.find('[data-test="deploy-dialog-live-resources"]');
};

const getDeployDialogStagedResources = wrapper => {
  return wrapper.find('[data-test="deploy-dialog-staged-resources"]');
};

const getDeployBtn = wrapper => {
  return wrapper.find('[data-test="deploy-btn"]');
};

describe('StagingTreeView', () => {
  it('renders no resources found message if a channel has no staging tree', () => {
    const getters = cloneDeep(GETTERS);
    getters.currentChannel.hasStagingTree = () => false;
    const wrapper = initWrapper({ getters });

    expect(wrapper.html()).toContain('No resources found');
  });

  describe('for a channel that has a staging tree', () => {
    let wrapper, mockDeployCurrentChannel;

    beforeEach(() => {
      jest.clearAllMocks();

      const getters = cloneDeep(GETTERS);
      const actions = cloneDeep(ACTIONS);

      getters.currentChannel.hasStagingTree = () => true;
      getters.currentChannel.rootId = () => 'channel-root-tree';
      getters.currentChannel.getCurrentChannelStagingDiff = () => {
        return {
          count_resources: {
            live: 0,
            staged: 2,
          },
          count_topics: {
            live: 0,
            staged: 1,
          },
          file_size_in_bytes: {
            live: 0,
            staged: 8000000,
          },
        };
      };
      getters.contentNode.getTreeNodeChildren = () => () => {
        return [{ id: 'id-topic' }, { id: 'id-document' }, { id: 'id-exercise' }];
      };
      getters.contentNode.getContentNodeChildren = () => () => {
        return [
          { id: 'id-topic', title: 'Topic', kind: ContentKindsNames.TOPIC },
          { id: 'id-document', title: 'Document', kind: ContentKindsNames.DOCUMENT },
          { id: 'id-exercise', title: 'Exercise', kind: ContentKindsNames.EXERCISE },
        ];
      };

      mockDeployCurrentChannel = jest.fn().mockResolvedValue('');
      actions.currentChannel.deployCurrentChannel = mockDeployCurrentChannel;
      //actions.channel.loadChannel = jest.fn().mockResolvedValue('')

      wrapper = initWrapper({ getters, actions });
      // make sure router is reset before each test
      if (wrapper.vm.$router.currentRoute.path !== '/') {
        wrapper.vm.$router.push('/');
      }
    });

    it("doesn't render no resources found message", () => {
      expect(wrapper.html()).not.toContain('No resources found');
    });

    it('renders children of a selected node', () => {
      const children = getContentNodeListItems(wrapper);

      expect(children.length).toBe(3);
      expect(children.at(0).html()).toContain('Topic');
      expect(children.at(1).html()).toContain('Document');
      expect(children.at(2).html()).toContain('Exercise');
    });

    describe('for a non-topic child resource', () => {
      let nonTopicResource;

      beforeEach(() => {
        nonTopicResource = getContentNodeListItems(wrapper).at(1);
      });

      it("doesn't render chevron right button", () => {
        expect(containsChevronRightBtn(nonTopicResource)).toBe(false);
      });

      it('redirects to a resource detail page on resource click', () => {
        expect(wrapper.vm.$router.currentRoute.name).toBeUndefined();

        nonTopicResource.trigger('click');

        const currentRoute = wrapper.vm.$router.currentRoute;
        expect(currentRoute.name).toBe(RouterNames.STAGING_TREE_VIEW);
        expect(currentRoute.params).toEqual({
          nodeId: NODE_ID,
          detailNodeId: 'id-document',
        });
      });

      it('redirects to a resource detail page on resource double click', () => {
        expect(wrapper.vm.$router.currentRoute.name).toBeUndefined();

        nonTopicResource.trigger('dblclick');

        const currentRoute = wrapper.vm.$router.currentRoute;
        expect(currentRoute.name).toBe(RouterNames.STAGING_TREE_VIEW);
        expect(currentRoute.params).toEqual({
          nodeId: NODE_ID,
          detailNodeId: 'id-document',
        });
      });

      it('redirects to a resource detail page on info button click', () => {
        expect(wrapper.vm.$router.currentRoute.name).toBeUndefined();

        getInfoBtn(nonTopicResource).trigger('click');

        const currentRoute = wrapper.vm.$router.currentRoute;
        expect(currentRoute.name).toBe(RouterNames.STAGING_TREE_VIEW);
        expect(currentRoute.params).toEqual({
          nodeId: NODE_ID,
          detailNodeId: 'id-document',
        });
      });
    });

    describe('for a topic child', () => {
      let topic;

      beforeEach(() => {
        topic = getContentNodeListItems(wrapper).at(0);
      });

      it('renders chevron right button', () => {
        expect(containsChevronRightBtn(topic)).toBe(true);
      });

      it('redirects to a topic children page on chevron right click', () => {
        expect(wrapper.vm.$router.currentRoute.name).toBeUndefined();

        getChevronRightBtn(topic).trigger('click');

        const currentRoute = wrapper.vm.$router.currentRoute;
        expect(currentRoute.name).toBe(RouterNames.STAGING_TREE_VIEW);
        expect(currentRoute.params).toEqual({
          nodeId: 'id-topic',
          detailNodeId: null,
        });
      });

      it('redirects to a topic children page on topic click', () => {
        expect(wrapper.vm.$router.currentRoute.name).toBeUndefined();

        topic.trigger('click');

        const currentRoute = wrapper.vm.$router.currentRoute;
        expect(currentRoute.name).toBe(RouterNames.STAGING_TREE_VIEW);
        expect(currentRoute.params).toEqual({
          nodeId: 'id-topic',
          detailNodeId: null,
        });
      });

      it('redirects to a topic children page on topic double click', () => {
        expect(wrapper.vm.$router.currentRoute.name).toBeUndefined();

        topic.trigger('dblclick');

        const currentRoute = wrapper.vm.$router.currentRoute;
        expect(currentRoute.name).toBe(RouterNames.STAGING_TREE_VIEW);
        expect(currentRoute.params).toEqual({
          nodeId: 'id-topic',
          detailNodeId: null,
        });
      });

      it('redirects to a topic detail page on info button click', () => {
        expect(wrapper.vm.$router.currentRoute.name).toBeUndefined();

        getInfoBtn(topic).trigger('click');

        const currentRoute = wrapper.vm.$router.currentRoute;
        expect(currentRoute.name).toBe(RouterNames.STAGING_TREE_VIEW);
        expect(currentRoute.params).toEqual({
          nodeId: NODE_ID,
          detailNodeId: 'id-topic',
        });
      });
    });

    it("doesn't render resource detail drawer when not on detail page", () => {
      wrapper.setProps({ detailNodeId: null });
      expect(containsResourceDetailDrawer(wrapper)).toBe(false);
    });

    it('renders resource detail drawer on detail page', () => {
      wrapper.setProps({ detailNodeId: 'id-document' });
      expect(containsResourceDetailDrawer(wrapper)).toBe(true);
    });

    it('renders total resources count and diff information in the bottom bar', () => {
      const text = getBottomBarStatsResourcesCount(wrapper).text();
      expect(removeMultipleSpaces(text)).toBe('Total resources: 2 (+ 2)');
    });

    it('renders total size and diff in the bottom bar', () => {
      const text = getBottomBarStatsFileSize(wrapper).text();
      expect(removeMultipleSpaces(text)).toBe('Total size: 8 MB (+ 8 MB)');
    });

    it('summary details dialog is not visible by default', () => {
      expect(getSummaryDetailsDialog(wrapper).isVisible()).toBe(false);
    });

    it('opens summary details dialog when view summary button is clicked', () => {
      getDisplaySummaryDetailsDialogBtn(wrapper).trigger('click');
      expect(getSummaryDetailsDialog(wrapper).isVisible()).toBe(true);
    });

    it('deploy dialog is not visible by default', () => {
      expect(getDeployDialog(wrapper).isVisible()).toBe(false);
    });

    it('opens deploy dialog when deploy button is clicked', () => {
      getDisplayDeployDialogBtn(wrapper).trigger('click');
      expect(getDeployDialog(wrapper).isVisible()).toBe(true);
    });

    describe('when deploy dialog is open', () => {
      beforeEach(() => {
        getDisplayDeployDialogBtn(wrapper).trigger('click');
      });

      it('renders live topics and resources counts', () => {
        const text = getDeployDialogLiveResources(wrapper).text();
        expect(removeMultipleSpaces(text)).toBe('Live resources: 0 topics , 0 resources');
      });

      it('renders staged topics and resources counts', () => {
        const text = getDeployDialogStagedResources(wrapper).text();
        expect(removeMultipleSpaces(text)).toBe('Staged resources: 1 topic , 2 resources');
      });

      it('dispatches deploy channel action on deploy channel button click', () => {
        getDeployBtn(wrapper).trigger('click');
        expect(mockDeployCurrentChannel).toHaveBeenCalledTimes(1);
      });

      it('redirects to a root tree page after deploy channel button click', async () => {
        getDeployBtn(wrapper).trigger('click');
        await flushPromises();

        expect(wrapper.vm.$router.currentRoute.name).toBe(RouterNames.TREE_VIEW);
        expect(wrapper.vm.$router.currentRoute.params).toEqual({
          nodeId: 'channel-root-tree',
        });
      });
    });
  });
});
