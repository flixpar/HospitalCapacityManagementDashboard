# Hospital Capacity Management Dashboard
Felix Parker, Diego A. Martínez, James Scheulen, Kimia Ghobadi

This repository contains the code for ["An Interactive Decision-Support Dashboard for Optimal Hospital Capacity Management"](https://arxiv.org/abs/2403.15634).

If you use this code, please cite our paper!
```
@misc{parker2024dashboard,
      title={An Interactive Decision-Support Dashboard for Optimal Hospital Capacity Management}, 
      author={Felix Parker and Diego A. Martínez and James Scheulen and Kimia Ghobadi},
      year={2024},
      eprint={2403.15634},
      archivePrefix={arXiv},
      primaryClass={cs.CY}
}
```

This repository was adapted from the original codebase created for the Johns Hopkins Health System. All code and data specific to their hospital system has been removed.

To run the dashboard server, first install Julia and the required packages in `Project.toml`. Then run:
```
./bin/server
```

See `data/README.md` for information about what data is required to run the server.
