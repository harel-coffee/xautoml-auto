import json

import numpy as np
from fanova import visualizer

from xautoml.hp_importance import HPImportance
from xautoml.tests import get_168746, get_autosklearn


def test_overview():
    main = get_168746()

    structure = main.run_history.structures[0]
    cs = structure.configspace
    loss = np.array([c.loss for c in structure.configs])
    configs = [c.config for c in structure.configs]

    f, X = HPImportance.construct_fanova(cs, configs, loss)
    overview = HPImportance.calculate_fanova_overview(f, X)
    print(overview)


def test_for_step():
    main = get_168746()

    structure = main.run_history.structures[0]
    cs = structure.configspace
    loss = np.array([c.loss for c in structure.configs])
    configs = [c.config for c in structure.configs]

    f, X = HPImportance.construct_fanova(cs, configs, loss)
    overview = HPImportance.calculate_fanova_overview(f, X, '1.1')
    print(overview)

    details = HPImportance.calculate_fanova_details(f, X, keys=overview['keys'])
    print(details)


def test_details():
    main = get_168746()

    structure = main.run_history.structures[0]
    cs = structure.configspace
    loss = np.array([c.loss for c in structure.configs])
    configs = [c.config for c in structure.configs]

    f, X = HPImportance.construct_fanova(cs, configs, loss)
    details = HPImportance.calculate_fanova_details(f, X)
    print(details)

    vis = visualizer.Visualizer(f, f.cs, '/tmp')

    discrete = HPImportance._get_plot_data(vis, 0)
    continuous = HPImportance._get_plot_data(vis, 6)

    disc_disc = HPImportance._get_pairwise_plot_data(vis, [0, 1])
    cont_cont = HPImportance._get_pairwise_plot_data(vis, [5, 6])
    disc_cont = HPImportance._get_pairwise_plot_data(vis, [0, 6])


def test_expected_performance_simulation():
    main = get_168746()

    structure = main.run_history.structures[0]
    cs = structure.configspace
    loss = np.array([c.loss for c in structure.configs])
    configs = [c.config for c in structure.configs]

    f, X = HPImportance.construct_fanova(cs, configs, loss)
    details = HPImportance.simulate_surrogate(f, X)
    details_js = json.dumps(details)


def test_fanova():
    main = get_168746()

    structure = main.run_history.structures[0]
    cs = structure.configspace
    loss = np.array([c.loss for c in structure.configs])
    configs = [c.config for c in structure.configs]

    f, X = HPImportance.construct_fanova(cs, configs, loss)
    vis = visualizer.Visualizer(f, f.cs, '/tmp')

    vis.plot_marginal(0)
    vis.plot_marginal(6)

    vis.plot_pairwise_marginal([0, 1], show=True)
    vis.plot_pairwise_marginal([5, 6], show=True)
    vis.plot_pairwise_marginal([0, 6], show=True)


def test_auto_sklearn():
    main = get_autosklearn()

    structure = main.run_history.structures[0]
    cs = main.run_history.default_configspace
    configs, loss = main._get_equivalent_configs(structure)

    f, X = HPImportance.construct_fanova(cs, configs, loss)

    overview = HPImportance.calculate_fanova_overview(f, X)
    print(overview)

    details = HPImportance.calculate_fanova_details(f, X)
    print(details)
