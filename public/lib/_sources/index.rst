DataBlox-OD
===========

**DataBlox-OD** is a Python toolkit for efficiently mining rich information from high-frequency global positioning system (GPS) data. 

Designed for development-related use cases, this package provides a suite of tools to simplify complex data processing and mining tasks into just a few lines of code. Features include:

* Mapping GPS data (pings) to areas of interest
* Inferring residence information from raw GPS data
* Identifying internal migration at varying administrative levels
* Identifying tourism activities and monitoring movement
* Adjusting GPS counts to improve representativeness

If you find our package useful, please consider citing:

  Cordel, M., Gonzales, M. E. M., Tiam-Lee, T. J., Ang Ngo Ching, J. D., Masaki, T., Cruz, R. A., & Tan, E. S. (2025). Flood-induced mobility patterns unveiled by mobile GPS tracking. Technical report. Development of Statistical Resources and Building Capacity in New Data Sources and Technologies.

Installation
------------
| **Operating system:** Windows, Linux, macOS
| **Python:** ≥ 3.10


1. Open a terminal from the root directory of this project (that is, the folder containing ``pyproject.toml``).

2. [Optional but recommended] Create a `virtual environment <https://docs.python.org/3/library/venv.html>`_: ::

    python3 -m venv .venv

   Activate this virtual environment:

   * For Windows users: ::

      .venv\Scripts\activate
        
   * For Linux and macOS users: ::

      source .venv/bin/activate

3. Install DataBlox-OD: ::
    
    python3 -m pip install .

Usage
-----
Kindly refer to the tutorials and API reference for guidance on how to use DataBlox-OD.

By using this package, you agree to the Asian Development Bank's :doc:`terms of use <meta/TERMS_OF_USE>`.

Modification, distribution, or reproduction of this software product, which includes associated software components, media, documentation, data files, and underlying algorithm, in whole or in part, is strictly prohibited without prior written permission from the authors.

By accessing or using this code, you agree not to alter, share, copy, or use it for any purpose other than originally intended, unless explicitly authorized.

Authors
-------

* | **Mark Edward M. Gonzales, MSc** (`Google Scholar <https://scholar.google.com/citations?user=YSwwCpAAAAAJ&hl=en>`_, `ORCID <https://orcid.org/0000-0001-5050-3157>`_)
  | Consultant, Asian Development Bank
  | gonzales.markedward@gmail.com
* | **Thomas James Z. Tiam-Lee, PhD** (`Google Scholar <https://scholar.google.com/citations?user=_LmluKUAAAAJ&hl=en>`_, `ORCID <https://orcid.org/0000-0003-1820-3984>`_)
  | Consultant, Asian Development Bank
  | thomas.tiam-lee@dlsu.edu.ph
* | **Macario O. Cordel, II, PhD** (`Google Scholar <https://scholar.google.com/citations?user=A3iyOR0AAAAJ&hl=en>`_, `ORCID <https://orcid.org/0000-0001-7270-9236>`_)
  | Data Scientist, Asian Development Bank
  | mcordel@adb.org

This package was developed and is maintained by the **Data Division, Economic Research and Development Impact Department, Asian Development Bank**.

This data tool is supported by Technical Assistance 6856, funded by the Government of Japan through the Japan Fund for Prosperity and Resilience in Asia and the Pacific.